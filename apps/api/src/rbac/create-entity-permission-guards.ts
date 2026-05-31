import type { preHandlerAsyncHookHandler } from "fastify";

import { ApiErrorCode } from "../crud/errors.js";
import { replyWithError } from "../crud/response.js";
import { createRequireAnyPermission } from "./create-require-permission.js";
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
    list: createRequireAnyPermission(deps, [
      `${entityName}.read`,
      `${entityName}.read_all`,
    ]),
    get: createRequireAnyPermission(deps, [
      `${entityName}.read`,
      `${entityName}.read_all`,
    ]),
    create: createRequireAnyPermission(deps, [`${entityName}.create`]),
    update: createRequireAnyPermission(deps, [
      `${entityName}.update`,
      `${entityName}.write_all`,
    ]),
    delete: createRequireAnyPermission(deps, [
      `${entityName}.delete`,
      `${entityName}.delete_all`,
    ]),
  };
}

export function createParametricEntityPermissionGuards(
  deps: LoadRequestPermissionsDeps,
): EntityPermissionGuards {
  function guardFor(
    action: "read" | "create" | "update" | "delete",
    alternate?: string,
  ) {
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

      const permissions = [`${entityName}.${action}`];
      if (alternate) {
        permissions.push(`${entityName}.${alternate}`);
      }

      return createRequireAnyPermission(deps, permissions)(request, reply);
    };
  }

  return {
    list: guardFor("read", "read_all"),
    get: guardFor("read", "read_all"),
    create: guardFor("create"),
    update: guardFor("update", "write_all"),
    delete: guardFor("delete", "delete_all"),
  };
}
