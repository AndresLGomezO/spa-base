import type {
  FastifyReply,
  FastifyRequest,
  preHandlerAsyncHookHandler,
} from "fastify";

import { loadRequestPermissions } from "../rbac/load-request-permissions.js";
import type { LoadRequestPermissionsDeps } from "../rbac/load-request-permissions.js";
import { replyWithError } from "../crud/response.js";
import { ApiErrorCode } from "../crud/errors.js";

export function createRequireSuperAdmin(
  permissionDeps: LoadRequestPermissionsDeps,
): preHandlerAsyncHookHandler {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const ctx = await loadRequestPermissions(request, permissionDeps);
    if (!ctx.isSuperAdmin) {
      return replyWithError(
        reply,
        403,
        ApiErrorCode.FORBIDDEN,
        "Superadmin access is required.",
      );
    }
  };
}
