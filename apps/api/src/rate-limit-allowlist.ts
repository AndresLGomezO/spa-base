import type { FastifyRequest } from "fastify";

/** Routes that should not count toward the global API rate limit. */
export function isRateLimitExemptRequest(request: FastifyRequest): boolean {
  const method = request.method;
  const path = request.url.split("?")[0] ?? request.url;

  if (method === "GET" && path === "/auth/validate") {
    return true;
  }

  if (method === "POST" && path === "/auth/select-tenant") {
    return true;
  }

  if (method === "GET" && path === "/api/entities") {
    return true;
  }

  if (method === "PUT" && /\/api\/entities\/[^/]+\/ui-override$/.test(path)) {
    return true;
  }

  if (method === "GET" && path.startsWith("/api/entity-files/")) {
    return true;
  }

  if (method === "POST" && path === "/api/entity-files/upload") {
    return true;
  }

  return false;
}
