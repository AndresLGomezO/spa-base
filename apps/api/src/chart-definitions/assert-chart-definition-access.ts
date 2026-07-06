import type { FastifyReply, FastifyRequest } from "fastify";

import { hasPermission } from "@repo/rbac";

import { ApiErrorCode } from "../crud/errors.js";
import { replyWithError } from "../crud/response.js";
import {
  loadRequestPermissions,
  type LoadRequestPermissionsDeps,
} from "../rbac/load-request-permissions.js";

export async function assertCanReadChartDefinition(
  request: FastifyRequest,
  reply: FastifyReply,
  deps: LoadRequestPermissionsDeps,
): Promise<boolean> {
  const ctx = request.ctx;
  if (!ctx?.uid) {
    replyWithError(
      reply,
      401,
      ApiErrorCode.UNAUTHORIZED,
      "Authentication is required.",
    );
    return false;
  }

  const resolvedCtx = await loadRequestPermissions(request, deps);
  const allowed = hasPermission(
    "chartDefinition.read",
    resolvedCtx.permissions ?? [],
    {
      isSuperAdmin: resolvedCtx.isSuperAdmin,
    },
  );

  if (!allowed) {
    replyWithError(
      reply,
      403,
      ApiErrorCode.FORBIDDEN,
      "You do not have permission to perform this action.",
    );
    return false;
  }

  return true;
}
