import type { FastifyReply, FastifyRequest } from "fastify";

import { canReadMetricDefinition, canReadMetricValues } from "@repo/rbac";

import { ApiErrorCode } from "../crud/errors.js";
import { replyWithError } from "../crud/response.js";
import {
  loadRequestPermissions,
  type LoadRequestPermissionsDeps,
} from "../rbac/load-request-permissions.js";

export async function assertCanReadMetricValues(
  request: FastifyRequest,
  reply: FastifyReply,
  deps: LoadRequestPermissionsDeps,
  sourceModel: string,
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
  const allowed = canReadMetricValues(
    sourceModel,
    resolvedCtx.permissions ?? [],
    { isSuperAdmin: resolvedCtx.isSuperAdmin },
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

export async function assertCanReadMetricDefinition(
  request: FastifyRequest,
  reply: FastifyReply,
  deps: LoadRequestPermissionsDeps,
  sourceModel: string,
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
  const allowed = canReadMetricDefinition(
    sourceModel,
    resolvedCtx.permissions ?? [],
    { isSuperAdmin: resolvedCtx.isSuperAdmin },
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
