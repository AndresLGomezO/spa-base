import type { FastifyInstance, preHandlerAsyncHookHandler } from "fastify";
import { z } from "zod";

import {
  ENTITY_UI_OVERRIDE_WRITE_PERMISSIONS,
  normalizeEntityViews,
  putEntityUiOverrideInputSchema,
  serializeEntityDefinition,
  type EntityUIConfig,
} from "@repo/entities";
import type { EntityUiOverrideRepository } from "@repo/firestore-converters";

import { createAuthenticatePreHandler } from "../auth/authenticate-request.js";
import { ApiErrorCode } from "../crud/errors.js";
import { replyWithError, successEnvelope } from "../crud/response.js";
import { createRequireAnyPermission } from "../rbac/create-require-any-permission.js";
import type { LoadRequestPermissionsDeps } from "../rbac/load-request-permissions.js";
import type { EntityRuntimeContext } from "./entity-runtime-context.js";

interface RegisterEntityUiOverrideRoutesOptions {
  readonly authenticate: ReturnType<typeof createAuthenticatePreHandler>;
  readonly permissionDeps: LoadRequestPermissionsDeps;
  readonly entityRuntime: EntityRuntimeContext;
  readonly entityUiOverrideRepository: EntityUiOverrideRepository;
}

const entityNameParamSchema = z.object({
  entityName: z.string().trim().min(1),
});

export async function registerEntityUiOverrideRoutes(
  app: FastifyInstance,
  options: RegisterEntityUiOverrideRoutesOptions,
): Promise<void> {
  const requireEntityUiOverrideWrite = createRequireAnyPermission(
    options.permissionDeps,
    ENTITY_UI_OVERRIDE_WRITE_PERMISSIONS,
  );

  app.get(
    "/api/entities/:entityName/ui-override",
    {
      preHandler: [
        options.authenticate,
        requireEntityUiOverrideWrite as preHandlerAsyncHookHandler,
      ],
    },
    async (request, reply) => {
      const tenantId = request.ctx?.tenantId?.trim();
      if (!tenantId) {
        return replyWithError(
          reply,
          403,
          ApiErrorCode.TENANT_NOT_RESOLVED,
          "Tenant context is required.",
        );
      }

      const params = entityNameParamSchema.safeParse(request.params);
      if (!params.success) {
        return replyWithError(
          reply,
          400,
          ApiErrorCode.VALIDATION_ERROR,
          "Invalid entity name.",
        );
      }

      await options.entityRuntime.loadTenantDefinitions(tenantId);
      const entity = options.entityRuntime.getEntityDefinition(
        params.data.entityName,
        tenantId,
      );
      if (!entity) {
        return replyWithError(
          reply,
          404,
          ApiErrorCode.NOT_FOUND,
          `Entity "${params.data.entityName}" not found.`,
        );
      }

      const override = await options.entityUiOverrideRepository.get(
        tenantId,
        params.data.entityName,
      );

      return reply.send(successEnvelope({ override }));
    },
  );

  app.put(
    "/api/entities/:entityName/ui-override",
    {
      preHandler: [
        options.authenticate,
        requireEntityUiOverrideWrite as preHandlerAsyncHookHandler,
      ],
    },
    async (request, reply) => {
      const tenantId = request.ctx?.tenantId?.trim();
      if (!tenantId) {
        return replyWithError(
          reply,
          403,
          ApiErrorCode.TENANT_NOT_RESOLVED,
          "Tenant context is required.",
        );
      }

      const params = entityNameParamSchema.safeParse(request.params);
      if (!params.success) {
        return replyWithError(
          reply,
          400,
          ApiErrorCode.VALIDATION_ERROR,
          "Invalid entity name.",
        );
      }

      const parsedBody = putEntityUiOverrideInputSchema.safeParse(request.body);
      if (!parsedBody.success) {
        return replyWithError(
          reply,
          400,
          ApiErrorCode.VALIDATION_ERROR,
          "Invalid UI override payload.",
        );
      }

      await options.entityRuntime.loadTenantDefinitions(tenantId);
      const entity = options.entityRuntime.getEntityDefinition(
        params.data.entityName,
        tenantId,
      );
      if (!entity) {
        return replyWithError(
          reply,
          404,
          ApiErrorCode.NOT_FOUND,
          `Entity "${params.data.entityName}" not found.`,
        );
      }

      const serialized = serializeEntityDefinition(entity);
      const mergedUi: EntityUIConfig = {
        ...serialized.ui,
        views: normalizeEntityViews(
          parsedBody.data.views as EntityUIConfig["views"],
        ),
        ...(parsedBody.data.listViewType
          ? { listViewType: parsedBody.data.listViewType }
          : {}),
      };

      try {
        const { validateEntityUIConfig } = await import("@repo/entities");
        validateEntityUIConfig(entity, mergedUi);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Invalid UI configuration.";
        return replyWithError(
          reply,
          400,
          ApiErrorCode.VALIDATION_ERROR,
          message,
        );
      }

      const normalizedViews = [
        ...normalizeEntityViews(
          parsedBody.data.views as EntityUIConfig["views"],
        ),
      ];

      const override = await options.entityUiOverrideRepository.put(
        tenantId,
        params.data.entityName,
        {
          views: normalizedViews,
          ...(parsedBody.data.listViewType
            ? { listViewType: parsedBody.data.listViewType }
            : {}),
        },
      );

      return reply.send(successEnvelope({ override }));
    },
  );
}
