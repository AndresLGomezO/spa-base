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
import { requireRequestTenant } from "../auth/resolve-target-tenant-id.js";
import {
  applyReadFieldFilter,
  assertRequestWritableFields,
  FieldAccessError,
} from "../rbac/create-field-access-resolver.js";
import { checkRecordAccess } from "../access/record-access.js";
import {
  parsePopulateParam,
  type ReferencePopulatorDeps,
} from "../access/reference-populator.js";
import { resolveCrudHookEntityServices } from "../hooks/crud-hook-deps.js";
import { measureQueryTiming } from "../observability/request-timing.js";
import { apiEnv } from "../config/env.js";
import {
  assertCollectionIndexesReady,
  IndexCreatingError,
  IndexProvisioningFailedError,
} from "../indexes/index-query-guard.js";
import type { CrudHookDeps } from "../hooks/crud-hook-deps.types.js";
import {
  emitAggregationEventIfNeeded,
  type AggregationEmitterDeps,
} from "../aggregation/emit-aggregation-event.js";
import { runEntityHooks } from "../modules/run-entity-hooks.js";
import { ApiErrorCode } from "./errors.js";
import { noopPreHandler } from "./noop-pre-handler.js";
import { replyWithError, successEnvelope } from "./response.js";
import { parseOrFormatError, stripToSchemaKeys } from "./validation.js";

const listQuerySchema = z.object({
  limit: z.coerce.number().int().positive().max(100).optional(),
  cursor: z.string().trim().min(1).optional(),
  query: z.string().trim().min(1).optional(),
  search: z.string().trim().min(1).optional(),
  populate: z.string().trim().min(1).optional(),
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
  readonly collection?: string;
  readonly schema: z.ZodTypeAny;
  readonly createSchema: z.ZodTypeAny;
  readonly updateSchema: z.ZodTypeAny;
  readonly businessFieldNames: readonly string[];
  readonly prepareRecordForWrite?: (
    record: Record<string, unknown>,
  ) => Record<string, unknown>;
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
          userId?: string,
        ) => Promise<void>;
        readonly beforeDelete: (
          id: string,
          tenantId: string,
          userId?: string,
        ) => Promise<void>;
      }
    | ((entityName: string) =>
        | {
            readonly validateWrite: (
              record: Record<string, unknown>,
              mode: "create" | "update",
              userId?: string,
            ) => Promise<void>;
            readonly beforeDelete: (
              id: string,
              tenantId: string,
              userId?: string,
            ) => Promise<void>;
          }
        | undefined);
  readonly queryEngine?: QueryEngine;
  readonly indexStatusStore?: import("@repo/gcp-firebase").FirestoreIndexStatusStore;
  readonly referencePopulator?: ReferencePopulatorDeps;
  readonly prefix?: string;
  readonly parametricEntityName?: boolean;
  readonly crudHooks?: CrudHookDeps;
  readonly recordReadEnricher?: import("../entity-files/create-entity-file-read-enricher.js").RecordReadEnricher;
  readonly aggregation?: AggregationEmitterDeps;
}

async function tryEmitAggregationEvent(
  aggregation: AggregationEmitterDeps | undefined,
  input: Parameters<typeof emitAggregationEventIfNeeded>[1],
  logError: (error: unknown) => void,
): Promise<void> {
  if (!aggregation) {
    return;
  }

  try {
    await emitAggregationEventIfNeeded(aggregation, input);
  } catch (error) {
    logError(error);
  }
}

function requireTenant(
  request: FastifyRequest,
  reply: FastifyReply,
): string | null {
  return requireRequestTenant(request, reply);
}

function mapRelationErrorToResponse(
  reply: FastifyReply,
  error: RelationError,
): void {
  let statusCode = 400;
  if (error.code === "RELATION_DELETE_RESTRICTED") statusCode = 409;
  if (error.code === "REFERENCE_ACCESS_DENIED") statusCode = 400;

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
  if (error.code === ApiErrorCode.COMPOSITE_INDEX_REQUIRED) {
    reply.header("Retry-After", "60");
    replyWithError(
      reply,
      503,
      ApiErrorCode.COMPOSITE_INDEX_REQUIRED,
      error.message,
    );
    return;
  }

  const statusCode =
    error.code === ApiErrorCode.NOT_FOUND
      ? 404
      : error.code === ApiErrorCode.QUERY_FORBIDDEN
        ? 403
        : 400;

  replyWithError(reply, statusCode, error.code as ApiErrorCode, error.message);
}

function mapIndexCreatingError(
  reply: FastifyReply,
  error: IndexCreatingError,
): void {
  reply.header("Retry-After", String(error.retryAfterSeconds));
  replyWithError(reply, 503, ApiErrorCode.INDEX_CREATING, error.message, {
    collection: error.collection,
  });
}

function mapIndexProvisioningFailedError(
  reply: FastifyReply,
  error: IndexProvisioningFailedError,
): void {
  replyWithError(
    reply,
    503,
    ApiErrorCode.INDEX_PROVISIONING_FAILED,
    error.message,
    {
      collection: error.collection,
      errors: error.errors,
    },
  );
}

function handleFieldAccessError(reply: FastifyReply, error: unknown): boolean {
  if (!(error instanceof FieldAccessError)) {
    return false;
  }

  replyWithError(
    reply,
    400,
    ApiErrorCode.VALIDATION_ERROR,
    error.message,
    error.fieldErrors,
  );
  return true;
}

function filterRecordForRead<T extends Record<string, unknown>>(
  request: FastifyRequest,
  entity: CrudEntityDefinition,
  record: T,
): T {
  if (!request.ctx) {
    return record;
  }

  return applyReadFieldFilter(
    record,
    request.ctx,
    entity.name,
    entity.businessFieldNames,
  );
}

function filterPaginatedItemsForRead(
  request: FastifyRequest,
  entity: CrudEntityDefinition,
  items: readonly Record<string, unknown>[],
): Record<string, unknown>[] {
  return items.map((item) => filterRecordForRead(request, entity, item));
}

async function enrichRecordsForReadIfConfigured(
  records: readonly Record<string, unknown>[],
  options: Pick<RegisterCrudRoutesOptions<never, never>, "recordReadEnricher">,
  context: {
    readonly entityName: string;
    readonly tenantId: string;
    readonly request: FastifyRequest;
  },
): Promise<Record<string, unknown>[]> {
  if (!options.recordReadEnricher) {
    return [...records];
  }

  return options.recordReadEnricher(records, context);
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
  if (error instanceof IndexCreatingError) {
    mapIndexCreatingError(reply, error);
    return true;
  }
  if (error instanceof IndexProvisioningFailedError) {
    mapIndexProvisioningFailedError(reply, error);
    return true;
  }
  if (error instanceof QueryError) {
    mapQueryErrorToResponse(reply, error);
    return true;
  }
  return false;
}

function resolveEntityCollection(
  entity: CrudEntityDefinition,
  tenantId: string,
  referencePopulator?: ReferencePopulatorDeps,
): string | undefined {
  if (entity.collection) {
    return entity.collection;
  }
  return referencePopulator?.getEntityDefinition(entity.name, tenantId)
    ?.metadata.collection;
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
        userId?: string,
      ) => Promise<void>;
      readonly beforeDelete: (
        id: string,
        tenantId: string,
        userId?: string,
      ) => Promise<void>;
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

async function maybePopulate(
  entity: CrudEntityDefinition,
  records: readonly Record<string, unknown>[],
  request: FastifyRequest,
  tenantId: string,
  populatorDeps?: ReferencePopulatorDeps,
): Promise<readonly Record<string, unknown>[]> {
  const populateFields = parsePopulateParam(
    (request.query ?? {}) as Record<string, unknown>,
  );
  if (populateFields.length === 0 || !populatorDeps || !request.ctx) {
    return records;
  }

  const { createReferencePopulator } =
    await import("../access/reference-populator.js");
  const populator = createReferencePopulator(populatorDeps);

  const entityDef = populatorDeps.getEntityDefinition(entity.name, tenantId);
  if (!entityDef) {
    return records;
  }

  return populator.populateRecords(
    entityDef,
    records,
    populateFields,
    tenantId,
    request.ctx.uid,
  );
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
        const ctx = request.ctx;
        const collection = resolveEntityCollection(
          activeEntity,
          tenantId,
          options.referencePopulator,
        );
        if (collection) {
          await assertCollectionIndexesReady(
            options.indexStatusStore,
            collection,
          );
        }
        const result = await measureQueryTiming(request, async () =>
          queryEngine.find(
            activeEntity.name,
            parseListQueryInput(parsedQuery.data, {
              strictPagination: apiEnv.STRICT_QUERY_PAGINATION,
            }),
            buildQueryContext(ctx, tenantId),
          ),
        );

        const filteredItems = filterPaginatedItemsForRead(
          request,
          activeEntity,
          result.data as Record<string, unknown>[],
        );
        const enrichedItems = await enrichRecordsForReadIfConfigured(
          filteredItems,
          options,
          {
            entityName: activeEntity.name,
            tenantId,
            request,
          },
        );
        const populatedItems = await maybePopulate(
          activeEntity,
          enrichedItems,
          request,
          tenantId,
          options.referencePopulator,
        );

        return reply.send(
          successEnvelope({
            items: populatedItems,
            nextCursor: result.nextCursor ?? null,
            totalCount: result.totalCount,
          }),
        );
      }

      const result = await activeRepository.findAll({
        tenantId,
        limit: parsedQuery.data.limit,
        cursor: parsedQuery.data.cursor,
      });

      const filteredFallback = filterPaginatedItemsForRead(
        request,
        activeEntity,
        result.items as Record<string, unknown>[],
      );
      const enrichedFallback = await enrichRecordsForReadIfConfigured(
        filteredFallback,
        options,
        {
          entityName: activeEntity.name,
          tenantId,
          request,
        },
      );
      const populatedFallback = await maybePopulate(
        activeEntity,
        enrichedFallback,
        request,
        tenantId,
        options.referencePopulator,
      );

      return reply.send(
        successEnvelope({
          ...result,
          items: populatedFallback,
        }),
      );
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
          const ctx = request.ctx;
          const record = await queryEngine.findOne(
            activeEntity.name,
            recordId,
            buildQueryContext(ctx, tenantId),
          );

          const recordData = record as Record<string, unknown>;
          if (recordData.ownerId !== undefined) {
            const access = checkRecordAccess(recordData, ctx.uid);
            if (!access.canRead) {
              return replyWithError(
                reply,
                404,
                ApiErrorCode.NOT_FOUND,
                "Record not found.",
              );
            }
          }

          const filtered = filterRecordForRead(
            request,
            activeEntity,
            recordData,
          );
          const [enriched] = await enrichRecordsForReadIfConfigured(
            [filtered],
            options,
            {
              entityName: activeEntity.name,
              tenantId,
              request,
            },
          );
          const [populated] = await maybePopulate(
            activeEntity,
            [enriched ?? filtered],
            request,
            tenantId,
            options.referencePopulator,
          );
          return reply.send(successEnvelope(populated ?? enriched ?? filtered));
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

        const recordData = record as unknown as Record<string, unknown>;
        if (request.ctx && recordData.ownerId !== undefined) {
          const access = checkRecordAccess(recordData, request.ctx.uid);
          if (!access.canRead) {
            return replyWithError(
              reply,
              404,
              ApiErrorCode.NOT_FOUND,
              "Record not found.",
            );
          }
        }

        const filteredById = filterRecordForRead(
          request,
          activeEntity,
          recordData,
        );
        const [enrichedById] = await enrichRecordsForReadIfConfigured(
          [filteredById],
          options,
          {
            entityName: activeEntity.name,
            tenantId,
            request,
          },
        );
        const [populatedById] = await maybePopulate(
          activeEntity,
          [enrichedById ?? filteredById],
          request,
          tenantId,
          options.referencePopulator,
        );
        return reply.send(
          successEnvelope(populatedById ?? enrichedById ?? filteredById),
        );
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
        stripToSchemaKeys(activeEntity.createSchema, request.body),
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

      if (request.ctx) {
        try {
          assertRequestWritableFields(
            parsedBody.data as Record<string, unknown>,
            request.ctx,
            activeEntity.name,
            activeEntity.businessFieldNames,
            "create",
          );
        } catch (error) {
          if (handleFieldAccessError(reply, error)) {
            return;
          }
          throw error;
        }
      }

      const now = new Date().toISOString();
      const recordId = nanoid();

      try {
        const entityServices = await resolveHookServices(
          request,
          tenantId,
          options.crudHooks,
        );

        const ownerId = request.ctx?.uid ?? "";

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
            ownerId,
            accessUserIds: [ownerId],
            sharedWith: {},
          },
          ...(entityServices ? { entityServices } : {}),
        });

        if (activeEntity.prepareRecordForWrite) {
          currentData = activeEntity.prepareRecordForWrite(currentData);
        }

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
          await relationHooks.validateWrite(
            currentData,
            "create",
            request.ctx?.uid,
          );
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

        await tryEmitAggregationEvent(
          options.aggregation,
          {
            tenantId,
            entityName: activeEntity.name,
            operation: "CREATE",
            documentId: created.id,
            before: null,
            after: created as unknown as Record<string, unknown>,
            businessFieldNames: activeEntity.businessFieldNames,
          },
          (error) => {
            app.log.error(
              { err: error, entityName: activeEntity.name, tenantId },
              "Failed to emit aggregation event after create",
            );
          },
        );

        const filteredCreate = filterRecordForRead(
          request,
          activeEntity,
          created as unknown as Record<string, unknown>,
        );
        const [enrichedCreate] = await enrichRecordsForReadIfConfigured(
          [filteredCreate],
          options,
          {
            entityName: activeEntity.name,
            tenantId,
            request,
          },
        );

        return reply
          .status(201)
          .send(successEnvelope(enrichedCreate ?? filteredCreate));
      } catch (error) {
        if (handleFieldAccessError(reply, error)) {
          return;
        }
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
        stripToSchemaKeys(activeEntity.updateSchema, request.body),
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

      if (request.ctx) {
        try {
          assertRequestWritableFields(
            parsedBody.data as Record<string, unknown>,
            request.ctx,
            activeEntity.name,
            activeEntity.businessFieldNames,
            "update",
          );
        } catch (error) {
          if (handleFieldAccessError(reply, error)) {
            return;
          }
          throw error;
        }
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

      const existingRecord = existing as unknown as Record<string, unknown>;

      if (request.ctx && existingRecord.ownerId !== undefined) {
        const access = checkRecordAccess(existingRecord, request.ctx.uid);
        if (!access.canWrite) {
          return replyWithError(
            reply,
            404,
            ApiErrorCode.NOT_FOUND,
            "Record not found.",
          );
        }
      }

      const now = new Date().toISOString();
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

        if (activeEntity.prepareRecordForWrite) {
          merged = activeEntity.prepareRecordForWrite(merged);
        }

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
            request.ctx?.uid,
          );
        }

        const updatePayload: Record<string, unknown> = {
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

        await tryEmitAggregationEvent(
          options.aggregation,
          {
            tenantId,
            entityName: activeEntity.name,
            operation: "UPDATE",
            documentId: recordId,
            before: existingRecord,
            after: validated.data as Record<string, unknown>,
            businessFieldNames: activeEntity.businessFieldNames,
          },
          (error) => {
            app.log.error(
              { err: error, entityName: activeEntity.name, tenantId },
              "Failed to emit aggregation event after update",
            );
          },
        );

        const filteredUpdate = filterRecordForRead(
          request,
          activeEntity,
          validated.data as Record<string, unknown>,
        );
        const [enrichedUpdate] = await enrichRecordsForReadIfConfigured(
          [filteredUpdate],
          options,
          {
            entityName: activeEntity.name,
            tenantId,
            request,
          },
        );

        return reply.send(successEnvelope(enrichedUpdate ?? filteredUpdate));
      } catch (error) {
        if (handleFieldAccessError(reply, error)) {
          return;
        }
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

        if (request.ctx && existingRecord.ownerId !== undefined) {
          const access = checkRecordAccess(existingRecord, request.ctx.uid);
          if (!access.canDelete) {
            return replyWithError(
              reply,
              404,
              ApiErrorCode.NOT_FOUND,
              "Record not found.",
            );
          }
        }

        const entityServices = await resolveHookServices(
          request,
          tenantId,
          options.crudHooks,
        );

        const relationHooks = resolveRelationHooks(options, activeEntity.name);
        if (relationHooks) {
          await relationHooks.beforeDelete(
            recordId,
            tenantId,
            request.ctx?.uid,
          );
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

        await tryEmitAggregationEvent(
          options.aggregation,
          {
            tenantId,
            entityName: activeEntity.name,
            operation: "DELETE",
            documentId: recordId,
            before: existingRecord,
            after: null,
            businessFieldNames: activeEntity.businessFieldNames,
          },
          (error) => {
            app.log.error(
              { err: error, entityName: activeEntity.name, tenantId },
              "Failed to emit aggregation event after delete",
            );
          },
        );

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
