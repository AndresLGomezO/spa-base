import {
  updatePlatformRuntimeSettingsInputSchema,
  type RuntimeSettingsCache,
} from "@repo/debug-logs";
import type { GmailConnectionRepository } from "@repo/gcp-firebase";
import type { PlatformRuntimeSettingsRepository } from "@repo/firestore-converters";
import type { FastifyPluginAsync } from "fastify";

import { createAuthenticatePreHandler } from "../auth/authenticate-request.js";
import { createRequireSuperAdmin } from "../admin/require-superadmin.js";
import type { LoadRequestPermissionsDeps } from "../rbac/load-request-permissions.js";
import type { GmailTasksClient } from "../gmail-ingest/gmail-tasks.client.js";

export const platformRuntimeSettingsRoutes: FastifyPluginAsync<{
  readonly platformRuntimeSettingsRepository: PlatformRuntimeSettingsRepository;
  readonly runtimeSettingsCache: RuntimeSettingsCache;
  readonly permissionDeps: LoadRequestPermissionsDeps;
  readonly firebaseAdminConfig: Parameters<
    typeof createAuthenticatePreHandler
  >[0];
  readonly gmailConnectionRepository?: GmailConnectionRepository;
  readonly gmailTasksClient?: GmailTasksClient;
  readonly gmailPubsubTopic?: string;
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

      const previousMode =
        await opts.runtimeSettingsCache.getGmailIngestDeliveryMode();

      await opts.platformRuntimeSettingsRepository.update({
        ...parsedBody.data,
        updatedBy: uid,
      });
      opts.runtimeSettingsCache.invalidate();

      const nextMode =
        await opts.runtimeSettingsCache.getGmailIngestDeliveryMode();

      if (
        parsedBody.data.gmailIngestDeliveryMode !== undefined &&
        previousMode !== nextMode &&
        nextMode === "push"
      ) {
        await activatePushWatches({
          gmailConnectionRepository: opts.gmailConnectionRepository,
          gmailTasksClient: opts.gmailTasksClient,
          gmailPubsubTopic: opts.gmailPubsubTopic,
        });
      }

      const payload = await opts.runtimeSettingsCache.buildResponse();
      return reply.send({ ok: true, ...payload });
    },
  );
};

async function activatePushWatches(options: {
  readonly gmailConnectionRepository?: GmailConnectionRepository;
  readonly gmailTasksClient?: GmailTasksClient;
  readonly gmailPubsubTopic?: string;
}): Promise<void> {
  if (
    !options.gmailPubsubTopic ||
    !options.gmailConnectionRepository ||
    !options.gmailTasksClient
  ) {
    return;
  }
  const connections = await options.gmailConnectionRepository.listConnected();
  for (const connection of connections) {
    await options.gmailTasksClient.enqueueWatchRenew({
      userId: connection.userId,
      ...(connection.tenantId ? { tenantId: connection.tenantId } : {}),
    });
  }
}
