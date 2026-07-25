import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";

import { AI_TASK_ROUTES } from "@repo/ai-engine/task-routes";

import {
  nightlyUserAiMemoryTaskPayloadSchema,
  processNightlyUserAiMemoryRefresh,
  processUserAiMemoryRefresh,
  refreshUserAiMemoryTaskPayloadSchema,
  type UserAiMemoryRefreshProcessorDeps,
} from "../services/user-ai-memory-refresh-processor.js";

export async function userAiMemoryRefreshTaskRoute(
  app: FastifyInstance,
  deps: UserAiMemoryRefreshProcessorDeps,
): Promise<void> {
  app.post(
    AI_TASK_ROUTES.REFRESH_USER_AI_MEMORY,
    async (request: FastifyRequest, reply: FastifyReply) => {
      const parsed = refreshUserAiMemoryTaskPayloadSchema.safeParse(
        request.body,
      );
      if (!parsed.success) {
        return reply
          .status(200)
          .send({ success: false, error: "INVALID_PAYLOAD" });
      }
      const { tenantId, userId } = parsed.data;
      try {
        await processUserAiMemoryRefresh(deps, tenantId, userId);
        return reply.status(200).send({ success: true });
      } catch (error) {
        request.log.error(
          { err: error, tenantId, userId },
          "User AI memory refresh failed",
        );
        return reply
          .status(200)
          .send({ success: false, error: "PROCESSING_FAILED" });
      }
    },
  );

  app.post(
    AI_TASK_ROUTES.NIGHTLY_USER_AI_MEMORY,
    async (request: FastifyRequest, reply: FastifyReply) => {
      const parsed = nightlyUserAiMemoryTaskPayloadSchema.safeParse(
        request.body,
      );
      if (!parsed.success) {
        return reply
          .status(200)
          .send({ success: false, error: "INVALID_PAYLOAD" });
      }
      try {
        const result = await processNightlyUserAiMemoryRefresh(
          deps,
          parsed.data.tenantId,
          parsed.data.sinceIso,
        );
        return reply.status(200).send({ success: true, ...result });
      } catch (error) {
        request.log.error(
          { err: error, tenantId: parsed.data.tenantId },
          "Nightly user AI memory refresh failed",
        );
        return reply
          .status(200)
          .send({ success: false, error: "PROCESSING_FAILED" });
      }
    },
  );
}
