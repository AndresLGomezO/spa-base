import type { FastifyInstance, preHandlerAsyncHookHandler } from "fastify";

import { serializeEntityDefinition } from "@repo/entities";
import { getUiExtensions, mergeUiExtensions } from "@repo/modules";

import { createAuthenticatePreHandler } from "../auth/authenticate-request.js";
import { ApiErrorCode } from "../crud/errors.js";
import { replyWithError, successEnvelope } from "../crud/response.js";
import { createRequirePermission } from "../rbac/create-require-permission.js";
import type { LoadRequestPermissionsDeps } from "../rbac/load-request-permissions.js";
import type { EntityRuntimeContext } from "./entity-runtime-context.js";

interface RegisterListEntitiesRouteOptions {
  readonly authenticate: ReturnType<typeof createAuthenticatePreHandler>;
  readonly permissionDeps: LoadRequestPermissionsDeps;
  readonly entityRuntime: EntityRuntimeContext;
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

      const items = options.entityRuntime
        .getEntitiesForTenant(tenantId)
        .map((entity) => {
          const definition = serializeEntityDefinition(entity);
          const extensions = getUiExtensions(entity.name);
          if (extensions.length === 0) {
            return definition;
          }
          return {
            ...definition,
            ui: mergeUiExtensions(definition.ui, extensions),
          };
        })
        .filter((definition) => {
          if (isSuperAdmin) return true;
          return permissions.has(`${definition.name}.read`);
        });

      return reply.send(successEnvelope({ items }));
    },
  );
}
