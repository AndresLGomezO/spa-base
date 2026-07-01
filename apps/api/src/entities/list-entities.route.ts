import type { FastifyInstance, preHandlerAsyncHookHandler } from "fastify";
import { z } from "zod";

import type { FirebaseAdminConfig } from "@repo/gcp-firebase";

import { canIncludeEntityInCatalog } from "@repo/dynamic-entities";
import type { EntityUiOverrideRepository } from "@repo/firestore-converters";

import { createAuthenticatePreHandler } from "../auth/authenticate-request.js";
import { ApiErrorCode } from "../crud/errors.js";
import { replyWithError, successEnvelope } from "../crud/response.js";
import { enrichSerializableDefinitionsFileFields } from "../entity-files/enrich-definition-file-fields.js";
import { createRequirePermission } from "../rbac/create-require-permission.js";
import type { LoadRequestPermissionsDeps } from "../rbac/load-request-permissions.js";
import { serializeEntityCatalogEntry } from "./serialize-entity-catalog-entry.js";
import type { EntityRuntimeContext } from "./entity-runtime-context.js";

const entityNameParamSchema = z.object({
  entityName: z.string().trim().min(1),
});

interface RegisterListEntitiesRouteOptions {
  readonly authenticate: ReturnType<typeof createAuthenticatePreHandler>;
  readonly permissionDeps: LoadRequestPermissionsDeps;
  readonly entityRuntime: EntityRuntimeContext;
  readonly firebaseAdminConfig: FirebaseAdminConfig;
  readonly entityUiOverrideRepository: EntityUiOverrideRepository;
}

export async function registerListEntitiesRoute(
  app: FastifyInstance,
  options: RegisterListEntitiesRouteOptions,
): Promise<void> {
  const requireAnyEntityRead = createRequirePermission(
    options.permissionDeps,
    "*.read",
  );

  app.get(
    "/api/entities",
    {
      preHandler: [
        options.authenticate,
        requireAnyEntityRead as preHandlerAsyncHookHandler,
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

      await options.entityRuntime.loadTenantDefinitions(tenantId);

      const permissions = new Set(request.ctx?.permissions ?? []);
      const isSuperAdmin = request.ctx?.isSuperAdmin === true;

      const uiOverrides =
        await options.entityUiOverrideRepository.list(tenantId);
      const overrideByEntity = new Map(
        uiOverrides.map((override) => [override.entityName, override]),
      );

      const items = options.entityRuntime
        .getEntitiesForTenant(tenantId)
        .map((entity) =>
          serializeEntityCatalogEntry({
            entityRuntime: options.entityRuntime,
            tenantId,
            entityName: entity.name,
            requestCtx: request.ctx!,
            uiOverride: overrideByEntity.get(entity.name),
          }),
        )
        .filter((definition) => definition !== null)
        .filter((definition) => {
          if (
            !canIncludeEntityInCatalog(
              definition.hiddenFromNav,
              permissions,
              isSuperAdmin,
            )
          ) {
            return false;
          }
          if (isSuperAdmin) return true;
          return permissions.has(`${definition.name}.read`);
        });

      const enrichedItems = await enrichSerializableDefinitionsFileFields(
        options.firebaseAdminConfig,
        items,
      );

      return reply.send(successEnvelope({ items: enrichedItems }));
    },
  );

  app.get(
    "/api/entities/:entityName/definition",
    {
      preHandler: [
        options.authenticate,
        requireAnyEntityRead as preHandlerAsyncHookHandler,
      ],
    },
    async (request, reply) => {
      const parsedParams = entityNameParamSchema.safeParse(request.params);
      if (!parsedParams.success) {
        return replyWithError(
          reply,
          400,
          ApiErrorCode.VALIDATION_ERROR,
          "Invalid entity name.",
        );
      }

      const tenantId = request.ctx?.tenantId?.trim();
      if (!tenantId || !request.ctx) {
        return replyWithError(
          reply,
          403,
          ApiErrorCode.TENANT_NOT_RESOLVED,
          "Tenant context is required.",
        );
      }

      await options.entityRuntime.loadTenantDefinitions(tenantId);

      const uiOverride = await options.entityUiOverrideRepository.get(
        tenantId,
        parsedParams.data.entityName,
      );

      const definition = serializeEntityCatalogEntry({
        entityRuntime: options.entityRuntime,
        tenantId,
        entityName: parsedParams.data.entityName,
        requestCtx: request.ctx,
        uiOverride,
      });

      if (!definition) {
        return replyWithError(
          reply,
          403,
          ApiErrorCode.FORBIDDEN,
          "You do not have permission to view this entity definition.",
        );
      }

      const [enrichedDefinition] =
        await enrichSerializableDefinitionsFileFields(
          options.firebaseAdminConfig,
          [definition],
        );

      return reply.send(successEnvelope({ definition: enrichedDefinition }));
    },
  );
}
