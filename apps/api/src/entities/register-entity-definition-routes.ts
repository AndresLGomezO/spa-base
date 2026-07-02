import type { FastifyInstance, preHandlerAsyncHookHandler } from "fastify";
import { z } from "zod";

import {
  applyDisplayFieldToRecord,
  applyDescription,
  assertDynamicNameAvailable,
  assertNavCategoryExists,
  createEntityDefinitionInputSchema,
  DynamicEntityError,
  getAvailableEntityNamesForTenant,
  patchEntityDefinitionInputSchema,
  validateDefinitionEvolution,
  validateEntityDefinitionsCatalogEnvelope,
  validateRelationTargets,
} from "@repo/dynamic-entities";
import type { EntityCategoryRepository } from "@repo/firestore-converters";
import type { FirebaseAdminConfig } from "@repo/gcp-firebase";

import { ApiErrorCode } from "../crud/errors.js";
import { replyWithError, successEnvelope } from "../crud/response.js";
import { enrichEntityDefinitionRecordFileFields } from "../entity-files/enrich-definition-file-fields.js";
import { requireJwtTenant } from "../auth/resolve-target-tenant-id.js";
import { createRequirePermission } from "../rbac/create-require-permission.js";
import type { LoadRequestPermissionsDeps } from "../rbac/load-request-permissions.js";
import type { EntityRuntimeContext } from "./entity-runtime-context.js";
import { replaceEntityDefinitionsCatalog } from "./replace-entity-definitions-catalog.js";
import type { TenantIndexGuard } from "../indexes/create-tenant-index-guard.js";
import {
  syncEntityAiContextsForTenant,
  type SyncTenantAiContextsDeps,
} from "../ai/sync-tenant-ai-contexts.js";

interface RegisterEntityDefinitionRoutesOptions {
  readonly authenticate: preHandlerAsyncHookHandler;
  readonly permissionDeps: LoadRequestPermissionsDeps;
  readonly entityRuntime: EntityRuntimeContext;
  readonly entityCategoryRepository: EntityCategoryRepository;
  readonly firebaseAdminConfig: FirebaseAdminConfig;
  readonly tenantAiContextSync?: SyncTenantAiContextsDeps;
  readonly tenantIndexGuard?: TenantIndexGuard;
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
  const requireEntityCategoryCreate = createRequirePermission(
    options.permissionDeps,
    "entityCategory.create",
  );
  const requireEntityCategoryUpdate = createRequirePermission(
    options.permissionDeps,
    "entityCategory.update",
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
      const enrichedItems = await Promise.all(
        items.map((item) =>
          enrichEntityDefinitionRecordFileFields(
            options.firebaseAdminConfig,
            item,
          ),
        ),
      );
      return reply.send(successEnvelope({ items: enrichedItems }));
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

      const enrichedItem = await enrichEntityDefinitionRecordFileFields(
        options.firebaseAdminConfig,
        item,
      );

      return reply.send(successEnvelope(enrichedItem));
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
        if (options.tenantIndexGuard) {
          await options.tenantIndexGuard.assertEnvironmentReady(
            tenantId,
            "catalog_replace",
          );
        }
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
        await assertNavCategoryExists(
          options.entityCategoryRepository,
          tenantId,
          parsedBody.data.navCategoryId,
        );

        const created =
          await options.entityRuntime.entityDefinitionRepository.create(
            tenantId,
            parsedBody.data,
          );
        await options.entityRuntime.syncDefinition(created);
        if (options.tenantAiContextSync) {
          await syncEntityAiContextsForTenant(
            options.tenantAiContextSync,
            tenantId,
          );
        }
        return reply.status(201).send(successEnvelope(created));
      } catch (error) {
        if (options.tenantIndexGuard?.mapError(reply, error)) {
          return;
        }
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
        if (options.tenantIndexGuard) {
          await options.tenantIndexGuard.assertEnvironmentReady(
            tenantId,
            "catalog_replace",
          );
        }
        const next = applyDescription(
          applyDisplayFieldToRecord(
            {
              ...current,
              ...(parsedBody.data.label
                ? { label: parsedBody.data.label }
                : {}),
              ...(parsedBody.data.fields
                ? { fields: parsedBody.data.fields }
                : {}),
              ...(parsedBody.data.ui ? { ui: parsedBody.data.ui } : {}),
              ...(parsedBody.data.tenantWideRead !== undefined
                ? { tenantWideRead: parsedBody.data.tenantWideRead }
                : {}),
              ...(parsedBody.data.inMemoryListQueries !== undefined
                ? { inMemoryListQueries: parsedBody.data.inMemoryListQueries }
                : {}),
            },
            parsedBody.data,
          ),
          parsedBody.data.description,
        );
        validateDefinitionEvolution(current, next);
        await options.entityRuntime.loadTenantDefinitions(tenantId);
        const availableNames = getAvailableEntityNamesForTenant(
          tenantId,
          options.entityRuntime
            .getEntitiesForTenant(tenantId)
            .map((entity) => entity.name),
        );
        validateRelationTargets(next, availableNames);
        await assertNavCategoryExists(
          options.entityCategoryRepository,
          tenantId,
          parsedBody.data.navCategoryId,
        );

        const updated =
          await options.entityRuntime.entityDefinitionRepository.update(
            tenantId,
            parsedParams.data.id,
            parsedBody.data,
          );
        await options.entityRuntime.syncDefinition(updated, current);
        if (options.tenantAiContextSync) {
          await syncEntityAiContextsForTenant(
            options.tenantAiContextSync,
            tenantId,
          );
        }
        return reply.send(successEnvelope(updated));
      } catch (error) {
        if (options.tenantIndexGuard?.mapError(reply, error)) {
          return;
        }
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

  app.put(
    "/api/entity-definitions/catalog",
    {
      preHandler: [
        options.authenticate,
        requireEntityDefinitionCreate,
        requireEntityDefinitionUpdate,
        requireEntityCategoryCreate,
        requireEntityCategoryUpdate,
      ],
    },
    async (request, reply) => {
      const parsedBody = validateEntityDefinitionsCatalogEnvelope(request.body);
      if (!parsedBody.ok) {
        return replyWithError(
          reply,
          400,
          ApiErrorCode.VALIDATION_ERROR,
          "Validation failed.",
          parsedBody.errors,
        );
      }

      const tenantId = requireJwtTenant(request, reply);
      if (!tenantId) return;

      try {
        if (options.tenantIndexGuard) {
          await options.tenantIndexGuard.assertEnvironmentReady(
            tenantId,
            "catalog_replace",
          );
        }
        const result = await replaceEntityDefinitionsCatalog(
          {
            entityRuntime: options.entityRuntime,
            entityCategoryRepository: options.entityCategoryRepository,
            tenantAiContextSync: options.tenantAiContextSync,
          },
          tenantId,
          parsedBody.data,
        );
        const enrichedItems = await Promise.all(
          result.items.map((item) =>
            enrichEntityDefinitionRecordFileFields(
              options.firebaseAdminConfig,
              item,
            ),
          ),
        );
        return reply.send(
          successEnvelope({
            counts: result.counts,
            ...(result.categoryCounts
              ? { categoryCounts: result.categoryCounts }
              : {}),
            items: enrichedItems,
          }),
        );
      } catch (error) {
        if (options.tenantIndexGuard?.mapError(reply, error)) {
          return;
        }
        const message =
          error instanceof DynamicEntityError || error instanceof Error
            ? error.message
            : "Failed to replace entity definitions catalog.";
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
