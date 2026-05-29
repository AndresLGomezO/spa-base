import type { preHandlerAsyncHookHandler } from "fastify";

import { createRequirePermission } from "./create-require-permission.js";
import type { LoadRequestPermissionsDeps } from "./load-request-permissions.js";

interface EntityPermissionGuards {
  readonly list: preHandlerAsyncHookHandler;
  readonly get: preHandlerAsyncHookHandler;
  readonly create: preHandlerAsyncHookHandler;
  readonly update: preHandlerAsyncHookHandler;
  readonly delete: preHandlerAsyncHookHandler;
}

export function createEntityPermissionGuards(
  deps: LoadRequestPermissionsDeps,
  entityName: string,
): EntityPermissionGuards {
  return {
    list: createRequirePermission(deps, `${entityName}.read`),
    get: createRequirePermission(deps, `${entityName}.read`),
    create: createRequirePermission(deps, `${entityName}.create`),
    update: createRequirePermission(deps, `${entityName}.update`),
    delete: createRequirePermission(deps, `${entityName}.delete`),
  };
}
