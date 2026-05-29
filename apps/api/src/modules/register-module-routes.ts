import type { FastifyInstance, preHandlerAsyncHookHandler } from "fastify";

import { getRegisteredRoutes } from "@repo/modules";

import { createAuthenticatePreHandler } from "../auth/authenticate-request.js";
import { ApiErrorCode } from "../crud/errors.js";
import { replyWithError, successEnvelope } from "../crud/response.js";
import { createRequirePermission } from "../rbac/create-require-permission.js";
import type { LoadRequestPermissionsDeps } from "../rbac/load-request-permissions.js";

interface RegisterModuleRoutesOptions {
  readonly authenticate: ReturnType<typeof createAuthenticatePreHandler>;
  readonly permissionDeps: LoadRequestPermissionsDeps;
}

export async function registerModuleRoutes(
  app: FastifyInstance,
  options: RegisterModuleRoutesOptions,
): Promise<void> {
  for (const route of getRegisteredRoutes()) {
    const preHandlers: preHandlerAsyncHookHandler[] = [options.authenticate];

    if (route.permission) {
      preHandlers.push(
        createRequirePermission(
          options.permissionDeps,
          route.permission,
        ) as preHandlerAsyncHookHandler,
      );
    }

    app.route({
      method: route.method,
      url: route.path,
      preHandler: preHandlers,
      handler: async (request, reply) => {
        const tenantId = request.ctx?.tenantId?.trim();
        if (!tenantId) {
          return replyWithError(
            reply,
            403,
            ApiErrorCode.TENANT_NOT_RESOLVED,
            "Tenant context is required.",
          );
        }

        const query: Record<string, string | undefined> = {};
        for (const [key, value] of Object.entries(
          request.query as Record<string, unknown>,
        )) {
          query[key] =
            value === undefined || value === null ? undefined : String(value);
        }

        const result = await route.handler(
          { query },
          {
            userId: request.ctx?.uid ?? "",
            tenantId,
            permissions: request.ctx?.permissions ?? [],
            isSuperAdmin: request.ctx?.isSuperAdmin === true,
          },
        );

        return reply.send(successEnvelope(result));
      },
    });
  }
}
