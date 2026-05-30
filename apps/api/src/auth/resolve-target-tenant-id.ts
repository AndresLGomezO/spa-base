import type { FastifyReply, FastifyRequest } from "fastify";

import { ApiErrorCode } from "../crud/errors.js";
import { replyWithError } from "../crud/response.js";

export function resolveTargetTenantId(
  request: FastifyRequest,
  queryTenantId?: string,
): string | null {
  const ctxTenantId = request.ctx?.tenantId?.trim();
  if (request.ctx?.isSuperAdmin && queryTenantId) {
    return queryTenantId;
  }
  return ctxTenantId && ctxTenantId.length > 0 ? ctxTenantId : null;
}

export function parseQueryTenantId(
  request: FastifyRequest,
): string | undefined {
  const raw = request.query;
  if (typeof raw !== "object" || raw === null || !("tenantId" in raw)) {
    return undefined;
  }

  const value = (raw as Record<string, unknown>).tenantId;
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

export function requireTargetTenant(
  request: FastifyRequest,
  reply: FastifyReply,
  queryTenantId?: string,
): string | null {
  const tenantId = resolveTargetTenantId(
    request,
    queryTenantId ?? parseQueryTenantId(request),
  );
  if (!tenantId) {
    replyWithError(
      reply,
      403,
      ApiErrorCode.TENANT_NOT_RESOLVED,
      "Tenant context is required.",
    );
    return null;
  }
  return tenantId;
}

export function requireRequestTenant(
  request: FastifyRequest,
  reply: FastifyReply,
): string | null {
  return requireTargetTenant(request, reply, parseQueryTenantId(request));
}
