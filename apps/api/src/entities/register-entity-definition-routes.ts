import type { FastifyInstance, preHandlerAsyncHookHandler } from "fastify";
import { z } from "zod";

import {
  assertDynamicNameAvailable,
  createEntityDefinitionInputSchema,
  DynamicEntityError,
  getAvailableEntityNamesForTenant,
  patchEntityDefinitionInputSchema,
  validateDefinitionEvolution,
  validateRelationTargets,
} from "@repo/dynamic-entities";

import { ApiErrorCode } from "../crud/errors.js";
import { replyWithError, successEnvelope } from "../crud/response.js";
import { requireJwtTenant } from "../auth/resolve-target-tenant-id.js";
import { createRequirePermission } from "../rbac/create-require-permission.js";
import type { LoadRequestPermissionsDeps } from "../rbac/load-request-permissions.js";
import type { EntityRuntimeContext } from "./entity-runtime-context.js";

interface RegisterEntityDefinitionRoutesOptions {
  readonly authenticate: preHandlerAsyncHookHandler;
  readonly permissionDeps: LoadRequestPermissionsDeps;
  readonly entityRuntime: EntityRuntimeContext;
}

const tenantIdQuerySchema = z.object({
  tenantId: z.string().trim().min(1).optional(),
});

export async function registerEntityDefinitionRoutes(
  app: FastifyInstance,
  options: RegisterEntityDefinitionRoutesOptions,
): Promise<void> {
  const requireEntityDefinitionRead = createRequirePermission(
    options.permissionDeps,
    "entityDefinition.read",
  );
  const requireEntityDefinitionCreate = createRequirePermission(
    options.permissionDeps,
    "entityDefinition.create",
  );
  const requireEntityDefinitionUpdate = createRequirePermission(
    options.permissionDeps,
    "entityDefinition.update",
  );

  app.get(
    "/api/entity-definitions",
    {
      preHandler: [options.authenticate, requireEntityDefinitionRead],
    },
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

      await options.entityRuntime.loadTenantDefinitions(tenantId);
      const items =
        await options.entityRuntime.entityDefinitionRepository.list(tenantId);
      return reply.send(successEnvelope({ items }));
    },
  );

  app.get(
    "/api/entity-definitions/:id",
    {
      preHandler: [options.authenticate, requireEntityDefinitionRead],
    },
    async (request, reply) => {
      const parsedParams = z
        .object({ id: z.string().trim().min(1) })
        .safeParse(request.params);
      const parsedQuery = tenantIdQuerySchema.safeParse(request.query);
      if (!parsedParams.success || !parsedQuery.success) {
        return replyWithError(
          reply,
          400,
          ApiErrorCode.VALIDATION_ERROR,
          "Invalid request.",
        );
      }

      const tenantId = requireJwtTenant(request, reply);
      if (!tenantId) return;

      const item =
        await options.entityRuntime.entityDefinitionRepository.getById(
          tenantId,
          parsedParams.data.id,
        );
      if (!item) {
        return replyWithError(
          reply,
          404,
          ApiErrorCode.NOT_FOUND,
          "Entity definition not found.",
        );
      }

      return reply.send(successEnvelope(item));
    },
  );

  app.post(
    "/api/entity-definitions",
    {
      preHandler: [options.authenticate, requireEntityDefinitionCreate],
    },
    async (request, reply) => {
      const parsedBody = createEntityDefinitionInputSchema.safeParse(
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

      if (parsedBody.data.tenantId && request.ctx?.isSuperAdmin !== true) {
        return replyWithError(
          reply,
          403,
          ApiErrorCode.FORBIDDEN,
          "Only superadmin may target another tenant.",
        );
      }

      try {
        assertDynamicNameAvailable(parsedBody.data.name);
        await options.entityRuntime.loadTenantDefinitions(tenantId);
        const availableNames = getAvailableEntityNamesForTenant(
          tenantId,
          options.entityRuntime
            .getEntitiesForTenant(tenantId)
            .map((entity) => entity.name),
        );
        validateRelationTargets(
          {
            id: "pending",
            tenantId,
            name: parsedBody.data.name,
            label: parsedBody.data.label,
            fields: parsedBody.data.fields,
            ...(parsedBody.data.ui ? { ui: parsedBody.data.ui } : {}),
            version: 1,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
          availableNames,
        );

        const created =
          await options.entityRuntime.entityDefinitionRepository.create(
            tenantId,
            parsedBody.data,
          );
        await options.entityRuntime.syncDefinition(created);
        return reply.status(201).send(successEnvelope(created));
      } catch (error) {
        const message =
          error instanceof DynamicEntityError || error instanceof Error
            ? error.message
            : "Failed to create entity definition.";
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
    "/api/entity-definitions/:id",
    {
      preHandler: [options.authenticate, requireEntityDefinitionUpdate],
    },
    async (request, reply) => {
      const parsedParams = z
        .object({ id: z.string().trim().min(1) })
        .safeParse(request.params);
      const parsedBody = patchEntityDefinitionInputSchema.safeParse(
        request.body,
      );
      const parsedQuery = tenantIdQuerySchema.safeParse(request.query);
      if (
        !parsedParams.success ||
        !parsedBody.success ||
        !parsedQuery.success
      ) {
        return replyWithError(
          reply,
          400,
          ApiErrorCode.VALIDATION_ERROR,
          "Invalid request.",
        );
      }

      const tenantId = requireJwtTenant(request, reply);
      if (!tenantId) return;

      const current =
        await options.entityRuntime.entityDefinitionRepository.getById(
          tenantId,
          parsedParams.data.id,
        );
      if (!current) {
        return replyWithError(
          reply,
          404,
          ApiErrorCode.NOT_FOUND,
          "Entity definition not found.",
        );
      }

      try {
        const next = {
          ...current,
          ...(parsedBody.data.label ? { label: parsedBody.data.label } : {}),
          ...(parsedBody.data.fields ? { fields: parsedBody.data.fields } : {}),
          ...(parsedBody.data.ui ? { ui: parsedBody.data.ui } : {}),
        };
        validateDefinitionEvolution(current, next);
        await options.entityRuntime.loadTenantDefinitions(tenantId);
        const availableNames = getAvailableEntityNamesForTenant(
          tenantId,
          options.entityRuntime
            .getEntitiesForTenant(tenantId)
            .map((entity) => entity.name),
        );
        validateRelationTargets(next, availableNames);

        const updated =
          await options.entityRuntime.entityDefinitionRepository.update(
            tenantId,
            parsedParams.data.id,
            parsedBody.data,
          );
        await options.entityRuntime.syncDefinition(updated);
        return reply.send(successEnvelope(updated));
      } catch (error) {
        const message =
          error instanceof DynamicEntityError || error instanceof Error
            ? error.message
            : "Failed to update entity definition.";
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
