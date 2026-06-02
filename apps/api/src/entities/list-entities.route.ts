import type { FastifyInstance, preHandlerAsyncHookHandler } from "fastify";

import type { FirebaseAdminConfig } from "@repo/gcp-firebase";

import { canIncludeEntityInCatalog } from "@repo/dynamic-entities";
import {
  mergeEntityViewOverrides,
  serializeEntityDefinition,
} from "@repo/entities";
import { getUiExtensions, mergeUiExtensions } from "@repo/modules";
import type { EntityUiOverrideRepository } from "@repo/firestore-converters";

import { createAuthenticatePreHandler } from "../auth/authenticate-request.js";
import { ApiErrorCode } from "../crud/errors.js";
import { replyWithError, successEnvelope } from "../crud/response.js";
import { enrichSerializableDefinitionsFileFields } from "../entity-files/enrich-definition-file-fields.js";
import { resolveRequestFieldAccessMap } from "../rbac/create-field-access-resolver.js";
import { createRequirePermission } from "../rbac/create-require-permission.js";
import type { LoadRequestPermissionsDeps } from "../rbac/load-request-permissions.js";
import type { EntityRuntimeContext } from "./entity-runtime-context.js";

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
        .map((entity) => {
          const definition = serializeEntityDefinition(entity);
          const extensions = getUiExtensions(entity.name);
          const businessFieldNames = Object.keys(entity.metadata.fields);
          const base =
            extensions.length === 0
              ? definition
              : {
                  ...definition,
                  ui: mergeUiExtensions(definition.ui, extensions),
                };
          const override = overrideByEntity.get(entity.name);
          const mergedDefinition = mergeEntityViewOverrides(
            base,
            override
              ? {
                  entityName: override.entityName,
                  views: override.views as typeof base.ui.views,
                  ...(override.listViewType
                    ? { listViewType: override.listViewType }
                    : {}),
                  updatedAt: override.updatedAt,
                }
              : null,
          );

          if (isSuperAdmin || !request.ctx) {
            return mergedDefinition;
          }

          return {
            ...mergedDefinition,
            fieldAccess: resolveRequestFieldAccessMap(
              request.ctx,
              entity.name,
              businessFieldNames,
              "read",
            ),
          };
        })
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
}
