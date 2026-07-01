import {
  updatePlatformRuntimeSettingsInputSchema,
  type RuntimeSettingsCache,
} from "@repo/debug-logs";
import type { PlatformRuntimeSettingsRepository } from "@repo/firestore-converters";
import type { FastifyPluginAsync } from "fastify";

import { createAuthenticatePreHandler } from "../auth/authenticate-request.js";
import { createRequireSuperAdmin } from "../admin/require-superadmin.js";
import type { LoadRequestPermissionsDeps } from "../rbac/load-request-permissions.js";

export const platformRuntimeSettingsRoutes: FastifyPluginAsync<{
  readonly platformRuntimeSettingsRepository: PlatformRuntimeSettingsRepository;
  readonly runtimeSettingsCache: RuntimeSettingsCache;
  readonly permissionDeps: LoadRequestPermissionsDeps;
  readonly firebaseAdminConfig: Parameters<
    typeof createAuthenticatePreHandler
  >[0];
}> = async (fastify, opts) => {
  const authenticate = createAuthenticatePreHandler(opts.firebaseAdminConfig, {
    requireTenant: false,
  });
  const requireSuperAdmin = createRequireSuperAdmin(opts.permissionDeps);

  fastify.get(
    "/admin/platform/runtime-settings",
    { preHandler: [authenticate, requireSuperAdmin] },
    async (_request, reply) => {
      const payload = await opts.runtimeSettingsCache.buildResponse();
      return reply.send({ ok: true, ...payload });
    },
  );

  fastify.patch(
    "/admin/platform/runtime-settings",
    { preHandler: [authenticate, requireSuperAdmin] },
    async (request, reply) => {
      const parsedBody = updatePlatformRuntimeSettingsInputSchema.safeParse(
        request.body,
      );
      if (!parsedBody.success) {
        return reply.status(400).send({
          ok: false,
          message: "Invalid runtime settings payload.",
        });
      }

      const uid = request.ctx?.uid;
      if (!uid) {
        return reply.status(401).send({
          ok: false,
          message: "Authentication required.",
        });
      }

      await opts.platformRuntimeSettingsRepository.update({
        ...parsedBody.data,
        updatedBy: uid,
      });
      opts.runtimeSettingsCache.invalidate();

      const payload = await opts.runtimeSettingsCache.buildResponse();
      return reply.send({ ok: true, ...payload });
    },
  );
};
