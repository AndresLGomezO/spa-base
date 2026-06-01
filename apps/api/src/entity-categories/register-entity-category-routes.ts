import type { FastifyInstance, preHandlerAsyncHookHandler } from "fastify";
import { z } from "zod";

import {
  createEntityCategoryInputSchema,
  patchEntityCategoryInputSchema,
} from "@repo/entity-categories";
import type {
  EntityCategoryRepository,
  EntityDefinitionRepository,
} from "@repo/firestore-converters";

import { requireJwtTenant } from "../auth/resolve-target-tenant-id.js";
import { ApiErrorCode } from "../crud/errors.js";
import { replyWithError, successEnvelope } from "../crud/response.js";
import { createRequirePermission } from "../rbac/create-require-permission.js";
import type { LoadRequestPermissionsDeps } from "../rbac/load-request-permissions.js";

interface RegisterEntityCategoryRoutesOptions {
  readonly authenticate: preHandlerAsyncHookHandler;
  readonly permissionDeps: LoadRequestPermissionsDeps;
  readonly entityCategoryRepository: EntityCategoryRepository;
  readonly entityDefinitionRepository: EntityDefinitionRepository;
}

async function countDefinitionsUsingCategory(
  entityDefinitionRepository: EntityDefinitionRepository,
  tenantId: string,
  categoryId: string,
): Promise<number> {
  const definitions = await entityDefinitionRepository.list(tenantId);
  return definitions.filter(
    (definition) => definition.navCategoryId === categoryId,
  ).length;
}

export async function registerEntityCategoryRoutes(
  app: FastifyInstance,
  options: RegisterEntityCategoryRoutesOptions,
): Promise<void> {
  const requireAnyEntityRead = createRequirePermission(
    options.permissionDeps,
    "*.read",
  );
  const requireEntityCategoryRead = createRequirePermission(
    options.permissionDeps,
    "entityCategory.read",
  );
  const requireEntityCategoryCreate = createRequirePermission(
    options.permissionDeps,
    "entityCategory.create",
  );
  const requireEntityCategoryUpdate = createRequirePermission(
    options.permissionDeps,
    "entityCategory.update",
  );

  app.get(
    "/api/entity-categories",
    {
      preHandler: [options.authenticate, requireAnyEntityRead],
    },
    async (request, reply) => {
      const tenantId = requireJwtTenant(request, reply);
      if (!tenantId) return;

      const items = await options.entityCategoryRepository.list(tenantId);
      return reply.send(successEnvelope({ items }));
    },
  );

  app.get(
    "/api/entity-categories/:id",
    {
      preHandler: [options.authenticate, requireEntityCategoryRead],
    },
    async (request, reply) => {
      const parsedParams = z
        .object({ id: z.string().trim().min(1) })
        .safeParse(request.params);
      if (!parsedParams.success) {
        return replyWithError(
          reply,
          400,
          ApiErrorCode.VALIDATION_ERROR,
          "Invalid request.",
        );
      }

      const tenantId = requireJwtTenant(request, reply);
      if (!tenantId) return;

      const item = await options.entityCategoryRepository.getById(
        tenantId,
        parsedParams.data.id,
      );
      if (!item) {
        return replyWithError(
          reply,
          404,
          ApiErrorCode.NOT_FOUND,
          "Entity category not found.",
        );
      }

      return reply.send(successEnvelope(item));
    },
  );

  app.post(
    "/api/entity-categories",
    {
      preHandler: [options.authenticate, requireEntityCategoryCreate],
    },
    async (request, reply) => {
      const parsedBody = createEntityCategoryInputSchema.safeParse(
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

      const created = await options.entityCategoryRepository.create(
        tenantId,
        parsedBody.data,
      );
      return reply.status(201).send(successEnvelope(created));
    },
  );

  app.patch(
    "/api/entity-categories/:id",
    {
      preHandler: [options.authenticate, requireEntityCategoryUpdate],
    },
    async (request, reply) => {
      const parsedParams = z
        .object({ id: z.string().trim().min(1) })
        .safeParse(request.params);
      const parsedBody = patchEntityCategoryInputSchema.safeParse(request.body);
      if (!parsedParams.success || !parsedBody.success) {
        return replyWithError(
          reply,
          400,
          ApiErrorCode.VALIDATION_ERROR,
          "Invalid request.",
        );
      }

      const tenantId = requireJwtTenant(request, reply);
      if (!tenantId) return;

      try {
        const updated = await options.entityCategoryRepository.update(
          tenantId,
          parsedParams.data.id,
          parsedBody.data,
        );
        return reply.send(successEnvelope(updated));
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Failed to update category.";
        return replyWithError(reply, 404, ApiErrorCode.NOT_FOUND, message);
      }
    },
  );

  app.delete(
    "/api/entity-categories/:id",
    {
      preHandler: [options.authenticate, requireEntityCategoryUpdate],
    },
    async (request, reply) => {
      const parsedParams = z
        .object({ id: z.string().trim().min(1) })
        .safeParse(request.params);
      if (!parsedParams.success) {
        return replyWithError(
          reply,
          400,
          ApiErrorCode.VALIDATION_ERROR,
          "Invalid request.",
        );
      }

      const tenantId = requireJwtTenant(request, reply);
      if (!tenantId) return;

      const categoryId = parsedParams.data.id;
      const usageCount = await countDefinitionsUsingCategory(
        options.entityDefinitionRepository,
        tenantId,
        categoryId,
      );
      if (usageCount > 0) {
        return replyWithError(
          reply,
          400,
          ApiErrorCode.VALIDATION_ERROR,
          `Cannot delete category while ${usageCount} entity model(s) are assigned to it.`,
        );
      }

      try {
        await options.entityCategoryRepository.delete(tenantId, categoryId);
        return reply.status(204).send();
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Failed to delete category.";
        return replyWithError(reply, 404, ApiErrorCode.NOT_FOUND, message);
      }
    },
  );
}
