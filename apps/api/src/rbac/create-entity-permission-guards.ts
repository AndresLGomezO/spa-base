import type { preHandlerAsyncHookHandler } from "fastify";

import { ApiErrorCode } from "../crud/errors.js";
import { replyWithError } from "../crud/response.js";
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

export function createParametricEntityPermissionGuards(
  deps: LoadRequestPermissionsDeps,
): EntityPermissionGuards {
  function guardFor(action: "read" | "create" | "update" | "delete") {
    return async function requireEntityPermission(
      request: Parameters<preHandlerAsyncHookHandler>[0],
      reply: Parameters<preHandlerAsyncHookHandler>[1],
    ): Promise<void> {
      const entityName =
        typeof request.params === "object" &&
        request.params !== null &&
        "entityName" in request.params &&
        typeof request.params.entityName === "string"
          ? request.params.entityName.trim()
          : "";

      if (!entityName) {
        replyWithError(
          reply,
          400,
          ApiErrorCode.VALIDATION_ERROR,
          "Invalid path parameters.",
        );
        return;
      }

      return createRequirePermission(deps, `${entityName}.${action}`)(
        request,
        reply,
      );
    };
  }

  return {
    list: guardFor("read"),
    get: guardFor("read"),
    create: guardFor("create"),
    update: guardFor("update"),
    delete: guardFor("delete"),
  };
}
