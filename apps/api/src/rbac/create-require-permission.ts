import type { FastifyReply, FastifyRequest } from "fastify";

import { hasPermission } from "@repo/rbac";

import { ApiErrorCode } from "../crud/errors.js";
import { replyWithError } from "../crud/response.js";
import {
  loadRequestPermissions,
  type LoadRequestPermissionsDeps,
} from "./load-request-permissions.js";

export function createRequirePermission(
  deps: LoadRequestPermissionsDeps,
  permission: string,
) {
  return async function requirePermission(
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
    const allowed = hasPermission(permission, resolvedCtx.permissions ?? [], {
      isSuperAdmin: resolvedCtx.isSuperAdmin,
    });

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
