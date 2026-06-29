import type { FastifyInstance, preHandlerAsyncHookHandler } from "fastify";
import { z } from "zod";

import {
  createEntityQueryDefinitionInputSchema,
  patchEntityQueryDefinitionInputSchema,
} from "@repo/entity-queries";
import type { EntityQueryDefinitionRepository } from "@repo/firestore-converters";

import { ApiErrorCode } from "../crud/errors.js";
import { replyWithError, successEnvelope } from "../crud/response.js";
import { requireJwtTenant } from "../auth/resolve-target-tenant-id.js";
import type { EntityRuntimeContext } from "../entities/entity-runtime-context.js";
import { createRequirePermission } from "../rbac/create-require-permission.js";
import type { LoadRequestPermissionsDeps } from "../rbac/load-request-permissions.js";
import { assertCanReadEntityQueryDefinition } from "./assert-entity-query-access.js";

interface RegisterEntityQueryDefinitionRoutesOptions {
  readonly authenticate: preHandlerAsyncHookHandler;
  readonly permissionDeps: LoadRequestPermissionsDeps;
  readonly entityRuntime: EntityRuntimeContext;
  readonly entityQueryDefinitionRepository: EntityQueryDefinitionRepository;
}

const tenantIdQuerySchema = z.object({
  tenantId: z.string().trim().min(1).optional(),
});

function getAvailableEntityNames(
  entityRuntime: EntityRuntimeContext,
  tenantId: string,
): readonly string[] {
  return entityRuntime
    .getEntitiesForTenant(tenantId)
    .map((entity) => entity.name);
}

export async function registerEntityQueryDefinitionRoutes(
  app: FastifyInstance,
  options: RegisterEntityQueryDefinitionRoutesOptions,
): Promise<void> {
  const requireRead = createRequirePermission(
    options.permissionDeps,
    "entityQueryDefinition.read",
  );
  const requireCreate = createRequirePermission(
    options.permissionDeps,
    "entityQueryDefinition.create",
  );
  const requireUpdate = createRequirePermission(
    options.permissionDeps,
    "entityQueryDefinition.update",
  );
  const requireDelete = createRequirePermission(
    options.permissionDeps,
    "entityQueryDefinition.delete",
  );

  app.get(
    "/api/entity-query-definitions",
    { preHandler: [options.authenticate, requireRead] },
    async (request, reply) => {
      const parsedQuery = tenantIdQuerySchema.safeParse(request.query);
      if (!parsedQuery.success) {
        return replyWithError(
          reply,
          400,
          ApiErrorCode.VALIDATION_ERROR,
          "Invalid query parameters.",
        );
      }

      const tenantId = requireJwtTenant(request, reply);
      if (!tenantId) return;

      const items =
        await options.entityQueryDefinitionRepository.list(tenantId);
      return reply.send(successEnvelope({ items }));
    },
  );

  app.get(
    "/api/entity-query-definitions/:id",
    { preHandler: [options.authenticate] },
    async (request, reply) => {
      const parsedParams = z
        .object({ id: z.string().trim().min(1) })
        .safeParse(request.params);
      if (!parsedParams.success) {
        return replyWithError(
          reply,
          400,
          ApiErrorCode.VALIDATION_ERROR,
          "Invalid path parameters.",
        );
      }

      const tenantId = requireJwtTenant(request, reply);
      if (!tenantId) return;

      const item = await options.entityQueryDefinitionRepository.getById(
        tenantId,
        parsedParams.data.id,
      );
      if (!item) {
        return replyWithError(
          reply,
          404,
          ApiErrorCode.NOT_FOUND,
          "Entity query definition not found.",
        );
      }

      if (
        !(await assertCanReadEntityQueryDefinition(
          request,
          reply,
          options.permissionDeps,
          item.sourceEntity,
        ))
      ) {
        return;
      }

      return reply.send(successEnvelope(item));
    },
  );

  app.post(
    "/api/entity-query-definitions",
    { preHandler: [options.authenticate, requireCreate] },
    async (request, reply) => {
      const parsedBody = createEntityQueryDefinitionInputSchema.safeParse(
        request.body,
      );
      if (!parsedBody.success) {
        return replyWithError(
          reply,
          400,
          ApiErrorCode.VALIDATION_ERROR,
          "Validation failed.",
          parsedBody.error.flatten(),
        );
      }

      const tenantId = requireJwtTenant(request, reply);
      if (!tenantId) return;

      const availableNames = getAvailableEntityNames(
        options.entityRuntime,
        tenantId,
      );
      if (!availableNames.includes(parsedBody.data.sourceEntity)) {
        return replyWithError(
          reply,
          400,
          ApiErrorCode.VALIDATION_ERROR,
          `Unknown source entity "${parsedBody.data.sourceEntity}".`,
        );
      }

      try {
        const created = await options.entityQueryDefinitionRepository.create(
          tenantId,
          parsedBody.data,
        );
        return reply.status(201).send(successEnvelope(created));
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Failed to create entity query definition.";
        return replyWithError(
          reply,
          400,
          ApiErrorCode.VALIDATION_ERROR,
          message,
        );
      }
    },
  );

  app.patch(
    "/api/entity-query-definitions/:id",
    { preHandler: [options.authenticate, requireUpdate] },
    async (request, reply) => {
      const parsedParams = z
        .object({ id: z.string().trim().min(1) })
        .safeParse(request.params);
      const parsedBody = patchEntityQueryDefinitionInputSchema.safeParse(
        request.body,
      );
      if (!parsedParams.success || !parsedBody.success) {
        return replyWithError(
          reply,
          400,
          ApiErrorCode.VALIDATION_ERROR,
          "Invalid request.",
          parsedBody.success ? undefined : parsedBody.error.flatten(),
        );
      }

      const tenantId = requireJwtTenant(request, reply);
      if (!tenantId) return;

      const current = await options.entityQueryDefinitionRepository.getById(
        tenantId,
        parsedParams.data.id,
      );
      if (!current) {
        return replyWithError(
          reply,
          404,
          ApiErrorCode.NOT_FOUND,
          "Entity query definition not found.",
        );
      }

      try {
        const updated = await options.entityQueryDefinitionRepository.update(
          tenantId,
          parsedParams.data.id,
          parsedBody.data,
        );
        return reply.send(successEnvelope(updated));
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Failed to update entity query definition.";
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
    "/api/entity-query-definitions/:id",
    { preHandler: [options.authenticate, requireDelete] },
    async (request, reply) => {
      const parsedParams = z
        .object({ id: z.string().trim().min(1) })
        .safeParse(request.params);
      if (!parsedParams.success) {
        return replyWithError(
          reply,
          400,
          ApiErrorCode.VALIDATION_ERROR,
          "Invalid path parameters.",
        );
      }

      const tenantId = requireJwtTenant(request, reply);
      if (!tenantId) return;

      const current = await options.entityQueryDefinitionRepository.getById(
        tenantId,
        parsedParams.data.id,
      );
      if (!current) {
        return replyWithError(
          reply,
          404,
          ApiErrorCode.NOT_FOUND,
          "Entity query definition not found.",
        );
      }

      await options.entityQueryDefinitionRepository.delete(
        tenantId,
        parsedParams.data.id,
      );
      return reply.send(successEnvelope({ ok: true }));
    },
  );
}
