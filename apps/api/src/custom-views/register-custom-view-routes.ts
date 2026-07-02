import type { FastifyInstance, preHandlerAsyncHookHandler } from "fastify";
import { z } from "zod";

import {
  buildDefaultCustomViewUI,
  createCustomViewInputSchema,
  customViewUIConfigSchema,
  formatCustomViewLabel,
  patchCustomViewInputSchema,
  slugCustomViewId,
  validateCustomViewsCatalogEnvelope,
  type CreateCustomViewInput,
  type CustomViewUIConfig,
} from "@repo/custom-views";
import { normalizeEntityViews, type ViewConfig } from "@repo/entities";
import type {
  CustomViewRepository,
  EntityCategoryRepository,
  EntityQueryDefinitionRepository,
} from "@repo/firestore-converters";
import { assertNavCategoryExists } from "@repo/dynamic-entities";

import { ApiErrorCode } from "../crud/errors.js";
import { replyWithError, successEnvelope } from "../crud/response.js";
import { requireJwtTenant } from "../auth/resolve-target-tenant-id.js";
import type { EntityRuntimeContext } from "../entities/entity-runtime-context.js";
import { createRequirePermission } from "../rbac/create-require-permission.js";
import type { LoadRequestPermissionsDeps } from "../rbac/load-request-permissions.js";
import {
  getEntityFieldNames,
  validateCustomViewUIConfig,
} from "./validate-custom-view-ui.js";
import {
  CustomViewCatalogReplaceError,
  replaceCustomViewsCatalog,
} from "./replace-custom-views-catalog.js";
import type { TenantIndexGuard } from "../indexes/create-tenant-index-guard.js";

interface RegisterCustomViewRoutesOptions {
  readonly authenticate: preHandlerAsyncHookHandler;
  readonly permissionDeps: LoadRequestPermissionsDeps;
  readonly entityRuntime: EntityRuntimeContext;
  readonly customViewRepository: CustomViewRepository;
  readonly entityQueryDefinitionRepository: EntityQueryDefinitionRepository;
  readonly entityCategoryRepository: EntityCategoryRepository;
  readonly tenantIndexGuard?: TenantIndexGuard;
}

const tenantIdQuerySchema = z.object({
  tenantId: z.string().trim().min(1).optional(),
});

const idParamSchema = z.object({ id: z.string().trim().min(1) });
const viewIdParamSchema = z.object({ viewId: z.string().trim().min(1) });

async function resolveQueryDefinition(
  repository: EntityQueryDefinitionRepository,
  tenantId: string,
  entityQueryDefinitionId: string,
) {
  const definition = await repository.getById(
    tenantId,
    entityQueryDefinitionId,
  );
  if (!definition) {
    throw new Error("Entity query definition not found.");
  }
  if (definition.status !== "ACTIVE") {
    throw new Error("Entity query definition must be ACTIVE.");
  }
  return definition;
}

type ParsedCustomViewUI = z.infer<typeof customViewUIConfigSchema>;
type ParsedCustomViewUIPatch = Partial<ParsedCustomViewUI>;

function normalizeCustomViewUiInput(
  ui: ParsedCustomViewUI,
): CustomViewUIConfig {
  return {
    ...ui,
    views: normalizeEntityViews(ui.views as readonly ViewConfig[]),
  } as CustomViewUIConfig;
}

function mergeCustomViewUi(
  current: CustomViewUIConfig,
  patch: ParsedCustomViewUIPatch,
): CustomViewUIConfig {
  return {
    ...current,
    ...patch,
    ...(patch.views
      ? {
          views: normalizeEntityViews(patch.views as readonly ViewConfig[]),
        }
      : {}),
  } as CustomViewUIConfig;
}

function toRepositoryUi(
  ui: CustomViewUIConfig,
): NonNullable<CreateCustomViewInput["ui"]> {
  return {
    ...ui,
    views: [...ui.views],
  } as NonNullable<CreateCustomViewInput["ui"]>;
}

export async function registerCustomViewRoutes(
  app: FastifyInstance,
  options: RegisterCustomViewRoutesOptions,
): Promise<void> {
  const requireRead = createRequirePermission(
    options.permissionDeps,
    "customView.read",
  );
  const requireCreate = createRequirePermission(
    options.permissionDeps,
    "customView.create",
  );
  const requireUpdate = createRequirePermission(
    options.permissionDeps,
    "customView.update",
  );
  const requireDelete = createRequirePermission(
    options.permissionDeps,
    "customView.delete",
  );

  app.get(
    "/api/custom-views",
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

      const items = await options.customViewRepository.list(tenantId);
      return reply.send(successEnvelope({ items }));
    },
  );

  app.get(
    "/api/custom-views/by-view-id/:viewId",
    { preHandler: [options.authenticate, requireRead] },
    async (request, reply) => {
      const parsedParams = viewIdParamSchema.safeParse(request.params);
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

      const item = await options.customViewRepository.getByViewId(
        tenantId,
        parsedParams.data.viewId,
      );
      if (!item) {
        return replyWithError(
          reply,
          404,
          ApiErrorCode.NOT_FOUND,
          "Custom view not found.",
        );
      }

      return reply.send(successEnvelope(item));
    },
  );

  app.get(
    "/api/custom-views/:id",
    { preHandler: [options.authenticate, requireRead] },
    async (request, reply) => {
      const parsedParams = idParamSchema.safeParse(request.params);
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

      const item = await options.customViewRepository.getById(
        tenantId,
        parsedParams.data.id,
      );
      if (!item) {
        return replyWithError(
          reply,
          404,
          ApiErrorCode.NOT_FOUND,
          "Custom view not found.",
        );
      }

      return reply.send(successEnvelope(item));
    },
  );

  app.post(
    "/api/custom-views",
    { preHandler: [options.authenticate, requireCreate] },
    async (request, reply) => {
      const parsedBody = createCustomViewInputSchema.safeParse(request.body);
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

      try {
        const queryDefinition = await resolveQueryDefinition(
          options.entityQueryDefinitionRepository,
          tenantId,
          parsedBody.data.entityQueryDefinitionId,
        );

        const entity = options.entityRuntime.getEntityDefinition(
          queryDefinition.sourceEntity,
          tenantId,
        );
        if (!entity) {
          return replyWithError(
            reply,
            400,
            ApiErrorCode.VALIDATION_ERROR,
            `Unknown source entity "${queryDefinition.sourceEntity}".`,
          );
        }

        await assertNavCategoryExists(
          options.entityCategoryRepository,
          tenantId,
          parsedBody.data.navCategoryId,
        );

        const fieldNames = getEntityFieldNames(entity);
        const defaultUi = buildDefaultCustomViewUI(
          queryDefinition.sourceEntity,
          fieldNames,
        );
        const ui: CustomViewUIConfig = parsedBody.data.ui
          ? normalizeCustomViewUiInput(parsedBody.data.ui)
          : defaultUi;
        validateCustomViewUIConfig(entity, ui);

        const nav = parsedBody.data.nav ?? {
          label: formatCustomViewLabel(parsedBody.data.name),
        };

        const viewId =
          parsedBody.data.viewId && parsedBody.data.viewId.trim().length > 0
            ? parsedBody.data.viewId.trim().toLowerCase()
            : slugCustomViewId(parsedBody.data.name);

        const created = await options.customViewRepository.create(tenantId, {
          ...parsedBody.data,
          viewId,
          nav,
          ui: toRepositoryUi(ui),
          sourceEntity: queryDefinition.sourceEntity,
        });
        return reply.status(201).send(successEnvelope(created));
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Failed to create custom view.";
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
    "/api/custom-views/:id",
    { preHandler: [options.authenticate, requireUpdate] },
    async (request, reply) => {
      const parsedParams = idParamSchema.safeParse(request.params);
      const parsedBody = patchCustomViewInputSchema.safeParse(request.body);
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

      const current = await options.customViewRepository.getById(
        tenantId,
        parsedParams.data.id,
      );
      if (!current) {
        return replyWithError(
          reply,
          404,
          ApiErrorCode.NOT_FOUND,
          "Custom view not found.",
        );
      }

      try {
        let sourceEntity = current.sourceEntity;

        if (parsedBody.data.entityQueryDefinitionId) {
          const queryDefinition = await resolveQueryDefinition(
            options.entityQueryDefinitionRepository,
            tenantId,
            parsedBody.data.entityQueryDefinitionId,
          );
          if (queryDefinition.sourceEntity !== current.sourceEntity) {
            throw new Error(
              "Cannot change query to one targeting a different source entity.",
            );
          }
          sourceEntity = queryDefinition.sourceEntity;
        }

        await assertNavCategoryExists(
          options.entityCategoryRepository,
          tenantId,
          parsedBody.data.navCategoryId ?? undefined,
        );

        const entity = options.entityRuntime.getEntityDefinition(
          sourceEntity,
          tenantId,
        );
        if (!entity) {
          return replyWithError(
            reply,
            400,
            ApiErrorCode.VALIDATION_ERROR,
            `Unknown source entity "${sourceEntity}".`,
          );
        }

        if (parsedBody.data.ui) {
          const mergedUi = mergeCustomViewUi(
            current.ui as CustomViewUIConfig,
            parsedBody.data.ui,
          );
          validateCustomViewUIConfig(entity, mergedUi);
        }

        const updated = await options.customViewRepository.update(
          tenantId,
          parsedParams.data.id,
          {
            ...parsedBody.data,
            ...(parsedBody.data.entityQueryDefinitionId
              ? { sourceEntity }
              : {}),
          },
        );
        return reply.send(successEnvelope(updated));
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Failed to update custom view.";
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
    "/api/custom-views/:id",
    { preHandler: [options.authenticate, requireDelete] },
    async (request, reply) => {
      const parsedParams = idParamSchema.safeParse(request.params);
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

      const current = await options.customViewRepository.getById(
        tenantId,
        parsedParams.data.id,
      );
      if (!current) {
        return replyWithError(
          reply,
          404,
          ApiErrorCode.NOT_FOUND,
          "Custom view not found.",
        );
      }

      await options.customViewRepository.delete(tenantId, parsedParams.data.id);
      return reply.send(successEnvelope({ ok: true }));
    },
  );

  app.put(
    "/api/custom-views/catalog",
    {
      preHandler: [
        options.authenticate,
        requireCreate,
        requireUpdate,
        requireDelete,
      ],
    },
    async (request, reply) => {
      const parsedBody = validateCustomViewsCatalogEnvelope(request.body);
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
        const result = await replaceCustomViewsCatalog(
          {
            entityRuntime: options.entityRuntime,
            customViewRepository: options.customViewRepository,
            entityQueryDefinitionRepository:
              options.entityQueryDefinitionRepository,
            entityCategoryRepository: options.entityCategoryRepository,
          },
          tenantId,
          parsedBody.data,
        );
        return reply.send(
          successEnvelope({
            counts: result.counts,
            items: result.items,
          }),
        );
      } catch (error) {
        if (options.tenantIndexGuard?.mapError(reply, error)) {
          return;
        }
        const message =
          error instanceof CustomViewCatalogReplaceError ||
          error instanceof Error
            ? error.message
            : "Failed to replace custom views catalog.";
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
