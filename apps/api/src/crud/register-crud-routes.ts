import type {
  FastifyInstance,
  FastifyReply,
  FastifyRequest,
  preHandlerAsyncHookHandler,
} from "fastify";
import { RelationError } from "@repo/entity-relations";
import {
  parseListQueryInput,
  QueryError,
  type QueryEngine,
} from "@repo/query-engine";
import { nanoid } from "nanoid";
import { z } from "zod";

import type { TenantScopedEntityRepository } from "@repo/firestore-converters";
import { HookExecutionError } from "@repo/hooks";

import type { RequestContext } from "../auth/request-context.js";
import { resolveCrudHookEntityServices } from "../hooks/crud-hook-deps.js";
import type { CrudHookDeps } from "../hooks/crud-hook-deps.types.js";
import { runEntityHooks } from "../modules/run-entity-hooks.js";
import { ApiErrorCode } from "./errors.js";
import { noopPreHandler } from "./noop-pre-handler.js";
import { replyWithError, successEnvelope } from "./response.js";
import { parseOrFormatError } from "./validation.js";

const listQuerySchema = z.object({
  limit: z.coerce.number().int().positive().max(100).optional(),
  cursor: z.string().trim().min(1).optional(),
  query: z.string().trim().min(1).optional(),
});

const entityNameParamsSchema = z.object({
  entityName: z.string().trim().min(1),
});

const idAndEntityParamsSchema = z.object({
  entityName: z.string().trim().min(1),
  id: z.string().trim().min(1),
});

interface CrudEntityDefinition {
  readonly name: string;
  readonly schema: z.ZodTypeAny;
  readonly createSchema: z.ZodTypeAny;
  readonly updateSchema: z.ZodTypeAny;
}

type EntityResolver = (
  tenantId: string,
  entityName?: string,
) => CrudEntityDefinition | null;

type RepositoryResolver<
  TRecord extends { readonly id: string; readonly tenantId: string },
  TUpdate,
> = (
  tenantId: string,
  entityName?: string,
) => TenantScopedEntityRepository<TRecord, TUpdate> | null;

interface RegisterCrudRoutesOptions<
  TRecord extends { readonly id: string; readonly tenantId: string },
  TUpdate,
> {
  readonly entityName?: string;
  readonly entity: CrudEntityDefinition | EntityResolver;
  readonly repository:
    | TenantScopedEntityRepository<TRecord, TUpdate>
    | RepositoryResolver<TRecord, TUpdate>;
  readonly authenticate: preHandlerAsyncHookHandler;
  readonly authorize?: {
    readonly list?: preHandlerAsyncHookHandler;
    readonly get?: preHandlerAsyncHookHandler;
    readonly create?: preHandlerAsyncHookHandler;
    readonly update?: preHandlerAsyncHookHandler;
    readonly delete?: preHandlerAsyncHookHandler;
  };
  readonly relations?:
    | {
        readonly validateWrite: (
          record: Record<string, unknown>,
          mode: "create" | "update",
        ) => Promise<void>;
        readonly beforeDelete: (id: string, tenantId: string) => Promise<void>;
      }
    | ((entityName: string) =>
        | {
            readonly validateWrite: (
              record: Record<string, unknown>,
              mode: "create" | "update",
            ) => Promise<void>;
            readonly beforeDelete: (
              id: string,
              tenantId: string,
            ) => Promise<void>;
          }
        | undefined);
  readonly queryEngine?: QueryEngine;
  readonly prefix?: string;
  readonly parametricEntityName?: boolean;
  readonly crudHooks?: CrudHookDeps;
}

function getTenantId(request: FastifyRequest): string | null {
  const tenantId = request.ctx?.tenantId?.trim();
  return tenantId && tenantId.length > 0 ? tenantId : null;
}

function requireTenant(
  request: FastifyRequest,
  reply: FastifyReply,
): string | null {
  const tenantId = getTenantId(request);
  if (!tenantId) {
    replyWithError(
      reply,
      403,
      ApiErrorCode.TENANT_NOT_RESOLVED,
      "Tenant context is required.",
    );
    return null;
  }
  return tenantId;
}

function mapRelationErrorToResponse(
  reply: FastifyReply,
  error: RelationError,
): void {
  const statusCode = error.code === "RELATION_DELETE_RESTRICTED" ? 409 : 400;

  replyWithError(reply, statusCode, error.code as ApiErrorCode, error.message);
}

function handleRelationError(reply: FastifyReply, error: unknown): boolean {
  if (error instanceof RelationError) {
    mapRelationErrorToResponse(reply, error);
    return true;
  }
  return false;
}

function buildQueryContext(
  ctx: RequestContext,
  tenantId: string,
): {
  userId: string;
  tenantId: string;
  permissions: readonly string[];
  isSuperAdmin?: boolean;
} {
  return {
    userId: ctx.uid,
    tenantId,
    permissions: ctx.permissions ?? [],
    ...(ctx.isSuperAdmin ? { isSuperAdmin: true } : {}),
  };
}

function mapQueryErrorToResponse(reply: FastifyReply, error: QueryError): void {
  const statusCode =
    error.code === ApiErrorCode.NOT_FOUND
      ? 404
      : error.code === ApiErrorCode.QUERY_FORBIDDEN
        ? 403
        : 400;

  replyWithError(reply, statusCode, error.code as ApiErrorCode, error.message);
}

function handleHookError(reply: FastifyReply, error: unknown): boolean {
  if (error instanceof HookExecutionError) {
    replyWithError(reply, 400, ApiErrorCode.VALIDATION_ERROR, error.message);
    return true;
  }
  return false;
}

async function resolveHookServices(
  request: FastifyRequest,
  tenantId: string,
  crudHooks: CrudHookDeps | undefined,
) {
  if (!crudHooks) {
    return undefined;
  }

  return resolveCrudHookEntityServices(request, tenantId, crudHooks);
}

function handleQueryError(reply: FastifyReply, error: unknown): boolean {
  if (error instanceof QueryError) {
    mapQueryErrorToResponse(reply, error);
    return true;
  }
  return false;
}

function resolveRouteEntityName(
  options: Pick<
    RegisterCrudRoutesOptions<never, never>,
    "entity" | "entityName"
  >,
): string {
  if (options.entityName) {
    return options.entityName;
  }
  if (typeof options.entity === "function") {
    throw new Error("entityName is required when entity is tenant-aware.");
  }
  return options.entity.name;
}

function resolveCrudRuntime<
  TRecord extends { readonly id: string; readonly tenantId: string },
  TUpdate,
>(
  options: Pick<
    RegisterCrudRoutesOptions<TRecord, TUpdate>,
    "entity" | "repository"
  >,
  tenantId: string,
  entityName?: string,
): {
  readonly entity: CrudEntityDefinition;
  readonly repository: TenantScopedEntityRepository<TRecord, TUpdate>;
} | null {
  const entity =
    typeof options.entity === "function"
      ? options.entity(tenantId, entityName)
      : options.entity;
  if (!entity) {
    return null;
  }

  const repository =
    typeof options.repository === "function"
      ? options.repository(tenantId, entityName)
      : options.repository;
  if (!repository) {
    return null;
  }

  return { entity, repository };
}

function resolveRelationHooks<
  TRecord extends { readonly id: string; readonly tenantId: string },
  TUpdate,
>(
  options: Pick<RegisterCrudRoutesOptions<TRecord, TUpdate>, "relations">,
  entityName: string,
):
  | {
      readonly validateWrite: (
        record: Record<string, unknown>,
        mode: "create" | "update",
      ) => Promise<void>;
      readonly beforeDelete: (id: string, tenantId: string) => Promise<void>;
    }
  | undefined {
  if (!options.relations) {
    return undefined;
  }

  if (typeof options.relations === "function") {
    return options.relations(entityName);
  }

  return options.relations;
}

export async function registerCrudRoutes<
  TRecord extends { readonly id: string; readonly tenantId: string },
  TUpdate,
>(
  app: FastifyInstance,
  options: RegisterCrudRoutesOptions<TRecord, TUpdate>,
): Promise<void> {
  const { entity, repository, authenticate, authorize, queryEngine } = options;
  const routePrefix = options.prefix ?? "/api";
  const routeEntityName = resolveRouteEntityName(options);
  const basePath = options.parametricEntityName
    ? `${routePrefix}/:entityName`
    : `${routePrefix}/${routeEntityName}`;
  const listPreHandlers = [authenticate, authorize?.list ?? noopPreHandler];
  const getPreHandlers = [authenticate, authorize?.get ?? noopPreHandler];
  const createPreHandlers = [authenticate, authorize?.create ?? noopPreHandler];
  const updatePreHandlers = [authenticate, authorize?.update ?? noopPreHandler];
  const deletePreHandlers = [authenticate, authorize?.delete ?? noopPreHandler];

  app.get(basePath, { preHandler: listPreHandlers }, async (request, reply) => {
    const tenantId = requireTenant(request, reply);
    if (!tenantId) return;

    let entityName: string | undefined;
    if (options.parametricEntityName) {
      const parsedParams = parseOrFormatError(
        entityNameParamsSchema,
        request.params,
      );
      if (!parsedParams.success) {
        return replyWithError(
          reply,
          400,
          ApiErrorCode.VALIDATION_ERROR,
          "Invalid path parameters.",
          parsedParams.details,
        );
      }
      entityName = parsedParams.data.entityName;
    }

    const runtime = resolveCrudRuntime(
      { entity, repository },
      tenantId,
      entityName,
    );
    if (!runtime) {
      return replyWithError(
        reply,
        404,
        ApiErrorCode.NOT_FOUND,
        "Entity not found.",
      );
    }
    const activeEntity = runtime.entity;
    const activeRepository = runtime.repository;

    const parsedQuery = parseOrFormatError(listQuerySchema, request.query);
    if (!parsedQuery.success) {
      return replyWithError(
        reply,
        400,
        ApiErrorCode.VALIDATION_ERROR,
        "Invalid query parameters.",
        parsedQuery.details,
      );
    }

    try {
      if (queryEngine && request.ctx) {
        const result = await queryEngine.find(
          activeEntity.name,
          parseListQueryInput(parsedQuery.data),
          buildQueryContext(request.ctx, tenantId),
        );

        return reply.send(
          successEnvelope({
            items: result.data,
            nextCursor: result.nextCursor ?? null,
          }),
        );
      }

      const result = await activeRepository.findAll({
        tenantId,
        limit: parsedQuery.data.limit,
        cursor: parsedQuery.data.cursor,
      });

      return reply.send(successEnvelope(result));
    } catch (error) {
      if (handleQueryError(reply, error)) {
        return;
      }
      throw error;
    }
  });

  app.get(
    `${basePath}/:id`,
    { preHandler: getPreHandlers },
    async (request, reply) => {
      const tenantId = requireTenant(request, reply);
      if (!tenantId) return;

      let entityName: string | undefined;
      let recordId: string;
      if (options.parametricEntityName) {
        const parsedParams = parseOrFormatError(
          idAndEntityParamsSchema,
          request.params,
        );
        if (!parsedParams.success) {
          return replyWithError(
            reply,
            400,
            ApiErrorCode.VALIDATION_ERROR,
            "Invalid path parameters.",
            parsedParams.details,
          );
        }
        entityName = parsedParams.data.entityName;
        recordId = parsedParams.data.id;
      } else {
        const parsedParams = parseOrFormatError(
          z.object({ id: z.string().trim().min(1) }),
          request.params,
        );
        if (!parsedParams.success) {
          return replyWithError(
            reply,
            400,
            ApiErrorCode.VALIDATION_ERROR,
            "Invalid path parameters.",
            parsedParams.details,
          );
        }
        recordId = parsedParams.data.id;
      }

      const runtime = resolveCrudRuntime(
        { entity, repository },
        tenantId,
        entityName,
      );
      if (!runtime) {
        return replyWithError(
          reply,
          404,
          ApiErrorCode.NOT_FOUND,
          "Entity not found.",
        );
      }
      const activeEntity = runtime.entity;
      const activeRepository = runtime.repository;

      try {
        if (queryEngine && request.ctx) {
          const record = await queryEngine.findOne(
            activeEntity.name,
            recordId,
            buildQueryContext(request.ctx, tenantId),
          );
          return reply.send(successEnvelope(record));
        }

        const record = await activeRepository.findById(recordId, tenantId);
        if (!record) {
          return replyWithError(
            reply,
            404,
            ApiErrorCode.NOT_FOUND,
            "Record not found.",
          );
        }

        return reply.send(successEnvelope(record));
      } catch (error) {
        if (handleQueryError(reply, error)) {
          return;
        }
        throw error;
      }
    },
  );

  app.post(
    basePath,
    { preHandler: createPreHandlers },
    async (request, reply) => {
      const tenantId = requireTenant(request, reply);
      if (!tenantId) return;

      let entityName: string | undefined;
      if (options.parametricEntityName) {
        const parsedParams = parseOrFormatError(
          entityNameParamsSchema,
          request.params,
        );
        if (!parsedParams.success) {
          return replyWithError(
            reply,
            400,
            ApiErrorCode.VALIDATION_ERROR,
            "Invalid path parameters.",
            parsedParams.details,
          );
        }
        entityName = parsedParams.data.entityName;
      }

      const runtime = resolveCrudRuntime(
        { entity, repository },
        tenantId,
        entityName,
      );
      if (!runtime) {
        return replyWithError(
          reply,
          404,
          ApiErrorCode.NOT_FOUND,
          "Entity not found.",
        );
      }
      const activeEntity = runtime.entity;
      const activeRepository = runtime.repository;

      const parsedBody = parseOrFormatError(
        activeEntity.createSchema,
        request.body,
      );
      if (!parsedBody.success) {
        return replyWithError(
          reply,
          400,
          ApiErrorCode.VALIDATION_ERROR,
          "Validation failed.",
          parsedBody.details,
        );
      }

      const now = new Date().toISOString();
      const recordId = nanoid();

      try {
        const entityServices = await resolveHookServices(
          request,
          tenantId,
          options.crudHooks,
        );

        let currentData = await runEntityHooks(app, request, {
          entityName: activeEntity.name,
          phase: "before",
          operation: "create",
          current: {
            ...(parsedBody.data as Record<string, unknown>),
            id: recordId,
            tenantId,
            createdAt: now,
            updatedAt: now,
          },
          ...(entityServices ? { entityServices } : {}),
        });

        const parsedRecord = parseOrFormatError(
          activeEntity.schema,
          currentData,
        );
        if (!parsedRecord.success) {
          return replyWithError(
            reply,
            400,
            ApiErrorCode.VALIDATION_ERROR,
            "Validation failed.",
            parsedRecord.details,
          );
        }

        currentData = parsedRecord.data as Record<string, unknown>;

        const relationHooks = resolveRelationHooks(options, activeEntity.name);
        if (relationHooks) {
          await relationHooks.validateWrite(currentData, "create");
        }

        const created = await activeRepository.create(
          tenantId,
          currentData as unknown as TRecord,
        );

        await runEntityHooks(app, request, {
          entityName: activeEntity.name,
          phase: "after",
          operation: "create",
          current: created as unknown as Record<string, unknown>,
          ...(entityServices ? { entityServices } : {}),
        });

        return reply.status(201).send(successEnvelope(created));
      } catch (error) {
        if (handleHookError(reply, error)) {
          return;
        }
        const relationResponse = handleRelationError(reply, error);
        if (relationResponse) {
          return;
        }

        const message =
          error instanceof Error ? error.message : "Failed to create record.";
        return replyWithError(
          reply,
          400,
          ApiErrorCode.VALIDATION_ERROR,
          message,
        );
      }
    },
  );

  app.put(
    `${basePath}/:id`,
    { preHandler: updatePreHandlers },
    async (request, reply) => {
      const tenantId = requireTenant(request, reply);
      if (!tenantId) return;

      let entityName: string | undefined;
      let recordId: string;
      if (options.parametricEntityName) {
        const parsedPathParams = parseOrFormatError(
          idAndEntityParamsSchema,
          request.params,
        );
        if (!parsedPathParams.success) {
          return replyWithError(
            reply,
            400,
            ApiErrorCode.VALIDATION_ERROR,
            "Invalid path parameters.",
            parsedPathParams.details,
          );
        }
        entityName = parsedPathParams.data.entityName;
        recordId = parsedPathParams.data.id;
      } else {
        const parsedPathParams = parseOrFormatError(
          z.object({ id: z.string().trim().min(1) }),
          request.params,
        );
        if (!parsedPathParams.success) {
          return replyWithError(
            reply,
            400,
            ApiErrorCode.VALIDATION_ERROR,
            "Invalid path parameters.",
            parsedPathParams.details,
          );
        }
        recordId = parsedPathParams.data.id;
      }

      const runtime = resolveCrudRuntime(
        { entity, repository },
        tenantId,
        entityName,
      );
      if (!runtime) {
        return replyWithError(
          reply,
          404,
          ApiErrorCode.NOT_FOUND,
          "Entity not found.",
        );
      }
      const activeEntity = runtime.entity;
      const activeRepository = runtime.repository;

      const parsedBody = parseOrFormatError(
        activeEntity.updateSchema,
        request.body,
      );
      if (!parsedBody.success) {
        return replyWithError(
          reply,
          400,
          ApiErrorCode.VALIDATION_ERROR,
          "Validation failed.",
          parsedBody.details,
        );
      }

      const existing = await activeRepository.findById(recordId, tenantId);
      if (!existing) {
        return replyWithError(
          reply,
          404,
          ApiErrorCode.NOT_FOUND,
          "Record not found.",
        );
      }

      const now = new Date().toISOString();
      const existingRecord = existing as unknown as Record<string, unknown>;
      let merged: Record<string, unknown> = {
        ...existingRecord,
        ...(parsedBody.data as Record<string, unknown>),
        id: existing.id,
        tenantId: existing.tenantId,
        updatedAt: now,
      };

      try {
        const entityServices = await resolveHookServices(
          request,
          tenantId,
          options.crudHooks,
        );

        merged = await runEntityHooks(app, request, {
          entityName: activeEntity.name,
          phase: "before",
          operation: "update",
          current: merged,
          previous: existingRecord,
          ...(entityServices ? { entityServices } : {}),
        });

        const parsedRecord = parseOrFormatError(activeEntity.schema, merged);
        if (!parsedRecord.success) {
          return replyWithError(
            reply,
            400,
            ApiErrorCode.VALIDATION_ERROR,
            "Validation failed.",
            parsedRecord.details,
          );
        }

        const relationHooks = resolveRelationHooks(options, activeEntity.name);
        if (relationHooks) {
          await relationHooks.validateWrite(
            parsedRecord.data as Record<string, unknown>,
            "update",
          );
        }

        const updatePayload = {
          ...(parsedRecord.data as Record<string, unknown>),
        };
        delete updatePayload.id;
        delete updatePayload.tenantId;
        delete updatePayload.createdAt;

        const updated = await activeRepository.update(
          recordId,
          tenantId,
          updatePayload as TUpdate,
        );

        if (!updated) {
          return replyWithError(
            reply,
            404,
            ApiErrorCode.NOT_FOUND,
            "Record not found.",
          );
        }

        const validated = parseOrFormatError(activeEntity.schema, updated);
        if (!validated.success) {
          return replyWithError(
            reply,
            400,
            ApiErrorCode.VALIDATION_ERROR,
            "Validation failed.",
            validated.details,
          );
        }

        await runEntityHooks(app, request, {
          entityName: activeEntity.name,
          phase: "after",
          operation: "update",
          current: validated.data as Record<string, unknown>,
          previous: existingRecord,
          ...(entityServices ? { entityServices } : {}),
        });

        return reply.send(successEnvelope(validated.data));
      } catch (error) {
        if (handleHookError(reply, error)) {
          return;
        }
        const relationResponse = handleRelationError(reply, error);
        if (relationResponse) {
          return;
        }

        const message =
          error instanceof Error ? error.message : "Failed to update record.";
        return replyWithError(
          reply,
          400,
          ApiErrorCode.VALIDATION_ERROR,
          message,
        );
      }
    },
  );

  app.delete(
    `${basePath}/:id`,
    { preHandler: deletePreHandlers },
    async (request, reply) => {
      const tenantId = requireTenant(request, reply);
      if (!tenantId) return;

      let entityName: string | undefined;
      let recordId: string;
      if (options.parametricEntityName) {
        const parsedPathParams = parseOrFormatError(
          idAndEntityParamsSchema,
          request.params,
        );
        if (!parsedPathParams.success) {
          return replyWithError(
            reply,
            400,
            ApiErrorCode.VALIDATION_ERROR,
            "Invalid path parameters.",
            parsedPathParams.details,
          );
        }
        entityName = parsedPathParams.data.entityName;
        recordId = parsedPathParams.data.id;
      } else {
        const parsedPathParams = parseOrFormatError(
          z.object({ id: z.string().trim().min(1) }),
          request.params,
        );
        if (!parsedPathParams.success) {
          return replyWithError(
            reply,
            400,
            ApiErrorCode.VALIDATION_ERROR,
            "Invalid path parameters.",
            parsedPathParams.details,
          );
        }
        recordId = parsedPathParams.data.id;
      }

      const runtime = resolveCrudRuntime(
        { entity, repository },
        tenantId,
        entityName,
      );
      if (!runtime) {
        return replyWithError(
          reply,
          404,
          ApiErrorCode.NOT_FOUND,
          "Entity not found.",
        );
      }
      const activeEntity = runtime.entity;
      const activeRepository = runtime.repository;

      try {
        const existing = await activeRepository.findById(recordId, tenantId);
        if (!existing) {
          return replyWithError(
            reply,
            404,
            ApiErrorCode.NOT_FOUND,
            "Record not found.",
          );
        }

        const existingRecord = existing as unknown as Record<string, unknown>;
        const entityServices = await resolveHookServices(
          request,
          tenantId,
          options.crudHooks,
        );

        const relationHooks = resolveRelationHooks(options, activeEntity.name);
        if (relationHooks) {
          await relationHooks.beforeDelete(recordId, tenantId);
        }

        await runEntityHooks(app, request, {
          entityName: activeEntity.name,
          phase: "before",
          operation: "delete",
          current: existingRecord,
          previous: existingRecord,
          ...(entityServices ? { entityServices } : {}),
        });

        const deleted = await activeRepository.delete(recordId, tenantId);
        if (!deleted) {
          return replyWithError(
            reply,
            404,
            ApiErrorCode.NOT_FOUND,
            "Record not found.",
          );
        }

        await runEntityHooks(app, request, {
          entityName: activeEntity.name,
          phase: "after",
          operation: "delete",
          current: existingRecord,
          previous: existingRecord,
          ...(entityServices ? { entityServices } : {}),
        });

        return reply.send(successEnvelope({ deleted: true }));
      } catch (error) {
        if (handleHookError(reply, error)) {
          return;
        }
        const relationResponse = handleRelationError(reply, error);
        if (relationResponse) {
          return;
        }

        const message =
          error instanceof Error ? error.message : "Failed to delete record.";
        return replyWithError(
          reply,
          400,
          ApiErrorCode.VALIDATION_ERROR,
          message,
        );
      }
    },
  );
}
