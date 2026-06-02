import type { FastifyReply, FastifyRequest } from "fastify";

import { hasPermission, isTenantBuiltInAdminRole } from "@repo/rbac";

import { ApiErrorCode } from "../crud/errors.js";
import { replyWithError } from "../crud/response.js";
import {
  loadRequestPermissions,
  type LoadRequestPermissionsDeps,
} from "./load-request-permissions.js";

export function createRequireAnyPermission(
  deps: LoadRequestPermissionsDeps,
  permissions: readonly string[],
) {
  const required = permissions
    .map((permission) => permission.trim())
    .filter((permission) => permission.length > 0);

  return async function requireAnyPermission(
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<void> {
    const ctx = request.ctx;
    if (!ctx?.uid) {
      replyWithError(
        reply,
        401,
        ApiErrorCode.UNAUTHORIZED,
        "Authentication is required.",
      );
      return;
    }

    const resolvedCtx = await loadRequestPermissions(request, deps);
    const resolved = resolvedCtx.permissions ?? [];
    const allowed =
      isTenantBuiltInAdminRole(resolvedCtx.tenantRoleNames) ||
      required.some((permission) =>
        hasPermission(permission, resolved, {
          isSuperAdmin: resolvedCtx.isSuperAdmin,
        }),
      );

    if (!allowed) {
      replyWithError(
        reply,
        403,
        ApiErrorCode.FORBIDDEN,
        "You do not have permission to perform this action.",
      );
    }
  };
}
