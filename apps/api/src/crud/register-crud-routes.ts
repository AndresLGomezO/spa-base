import type {
  FastifyInstance,
  FastifyReply,
  FastifyRequest,
  preHandlerAsyncHookHandler,
} from "fastify";
import { nanoid } from "nanoid";
import { z } from "zod";

import type { TenantScopedEntityRepository } from "@repo/firestore-converters";

import { ApiErrorCode } from "./errors.js";
import { noopPreHandler } from "./noop-pre-handler.js";
import { replyWithError, successEnvelope } from "./response.js";
import { parseOrFormatError } from "./validation.js";

const listQuerySchema = z.object({
  limit: z.coerce.number().int().positive().max(100).optional(),
  cursor: z.string().trim().min(1).optional(),
});

const idParamsSchema = z.object({
  id: z.string().trim().min(1),
});

interface CrudEntityDefinition {
  readonly name: string;
  readonly schema: z.ZodTypeAny;
  readonly createSchema: z.ZodTypeAny;
  readonly updateSchema: z.ZodTypeAny;
}

interface RegisterCrudRoutesOptions<
  TRecord extends { readonly id: string; readonly tenantId: string },
  TUpdate,
> {
  readonly entity: CrudEntityDefinition;
  readonly repository: TenantScopedEntityRepository<TRecord, TUpdate>;
  readonly authenticate: preHandlerAsyncHookHandler;
  readonly requirePermission?: preHandlerAsyncHookHandler;
  readonly prefix?: string;
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

export async function registerCrudRoutes<
  TRecord extends { readonly id: string; readonly tenantId: string },
  TUpdate,
>(
  app: FastifyInstance,
  options: RegisterCrudRoutesOptions<TRecord, TUpdate>,
): Promise<void> {
  const { entity, repository, authenticate, requirePermission } = options;
  const routePrefix = options.prefix ?? "/api";
  const basePath = `${routePrefix}/${entity.name}`;
  const preHandlers = [authenticate, requirePermission ?? noopPreHandler];

  app.get(basePath, { preHandler: preHandlers }, async (request, reply) => {
    const tenantId = requireTenant(request, reply);
    if (!tenantId) return;

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

    const result = await repository.findAll({
      tenantId,
      limit: parsedQuery.data.limit,
      cursor: parsedQuery.data.cursor,
    });

    return reply.send(successEnvelope(result));
  });

  app.get(
    `${basePath}/:id`,
    { preHandler: preHandlers },
    async (request, reply) => {
      const tenantId = requireTenant(request, reply);
      if (!tenantId) return;

      const parsedParams = parseOrFormatError(idParamsSchema, request.params);
      if (!parsedParams.success) {
        return replyWithError(
          reply,
          400,
          ApiErrorCode.VALIDATION_ERROR,
          "Invalid path parameters.",
          parsedParams.details,
        );
      }

      const record = await repository.findById(parsedParams.data.id, tenantId);
      if (!record) {
        return replyWithError(
          reply,
          404,
          ApiErrorCode.NOT_FOUND,
          "Record not found.",
        );
      }

      return reply.send(successEnvelope(record));
    },
  );

  app.post(basePath, { preHandler: preHandlers }, async (request, reply) => {
    const tenantId = requireTenant(request, reply);
    if (!tenantId) return;

    const parsedBody = parseOrFormatError(entity.createSchema, request.body);
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
    const parsedRecord = parseOrFormatError(entity.schema, {
      ...(parsedBody.data as Record<string, unknown>),
      id: nanoid(),
      tenantId,
      createdAt: now,
      updatedAt: now,
    });

    if (!parsedRecord.success) {
      return replyWithError(
        reply,
        400,
        ApiErrorCode.VALIDATION_ERROR,
        "Validation failed.",
        parsedRecord.details,
      );
    }

    try {
      const created = await repository.create(
        tenantId,
        parsedRecord.data as unknown as TRecord,
      );
      return reply.status(201).send(successEnvelope(created));
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to create record.";
      return replyWithError(reply, 400, ApiErrorCode.VALIDATION_ERROR, message);
    }
  });

  app.put(
    `${basePath}/:id`,
    { preHandler: preHandlers },
    async (request, reply) => {
      const tenantId = requireTenant(request, reply);
      if (!tenantId) return;

      const parsedParams = parseOrFormatError(idParamsSchema, request.params);
      if (!parsedParams.success) {
        return replyWithError(
          reply,
          400,
          ApiErrorCode.VALIDATION_ERROR,
          "Invalid path parameters.",
          parsedParams.details,
        );
      }

      const parsedBody = parseOrFormatError(entity.updateSchema, request.body);
      if (!parsedBody.success) {
        return replyWithError(
          reply,
          400,
          ApiErrorCode.VALIDATION_ERROR,
          "Validation failed.",
          parsedBody.details,
        );
      }

      const existing = await repository.findById(
        parsedParams.data.id,
        tenantId,
      );
      if (!existing) {
        return replyWithError(
          reply,
          404,
          ApiErrorCode.NOT_FOUND,
          "Record not found.",
        );
      }

      const now = new Date().toISOString();
      const merged = {
        ...existing,
        ...(parsedBody.data as Record<string, unknown>),
        id: existing.id,
        tenantId: existing.tenantId,
        updatedAt: now,
      };

      const parsedRecord = parseOrFormatError(entity.schema, merged);
      if (!parsedRecord.success) {
        return replyWithError(
          reply,
          400,
          ApiErrorCode.VALIDATION_ERROR,
          "Validation failed.",
          parsedRecord.details,
        );
      }

      const updated = await repository.update(parsedParams.data.id, tenantId, {
        ...(parsedBody.data as Record<string, unknown>),
        updatedAt: now,
      } as TUpdate);

      if (!updated) {
        return replyWithError(
          reply,
          404,
          ApiErrorCode.NOT_FOUND,
          "Record not found.",
        );
      }

      const validated = parseOrFormatError(entity.schema, updated);
      if (!validated.success) {
        return replyWithError(
          reply,
          400,
          ApiErrorCode.VALIDATION_ERROR,
          "Validation failed.",
          validated.details,
        );
      }

      return reply.send(successEnvelope(validated.data));
    },
  );

  app.delete(
    `${basePath}/:id`,
    { preHandler: preHandlers },
    async (request, reply) => {
      const tenantId = requireTenant(request, reply);
      if (!tenantId) return;

      const parsedParams = parseOrFormatError(idParamsSchema, request.params);
      if (!parsedParams.success) {
        return replyWithError(
          reply,
          400,
          ApiErrorCode.VALIDATION_ERROR,
          "Invalid path parameters.",
          parsedParams.details,
        );
      }

      const deleted = await repository.delete(parsedParams.data.id, tenantId);
      if (!deleted) {
        return replyWithError(
          reply,
          404,
          ApiErrorCode.NOT_FOUND,
          "Record not found.",
        );
      }

      return reply.send(successEnvelope({ deleted: true }));
    },
  );
}
