import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";

import { AI_TASK_ROUTES } from "@repo/ai-engine";

import type { AiChatProcessorDeps } from "../services/ai-chat-processor.js";
import {
  PermanentTaskError,
  processAiChatJob,
  processAiChatTaskPayloadSchema,
} from "../services/ai-chat-processor.js";

export async function aiChatTaskRoute(
  app: FastifyInstance,
  opts: AiChatProcessorDeps,
): Promise<void> {
  app.post(
    AI_TASK_ROUTES.PROCESS_AI_CHAT,
    async (request: FastifyRequest, reply: FastifyReply) => {
      const parsed = processAiChatTaskPayloadSchema.safeParse(request.body);
      if (!parsed.success) {
        request.log.warn(
          { validation: parsed.error.flatten() },
          "Invalid AI chat task payload",
        );
        return reply
          .status(200)
          .send({ success: false, error: "INVALID_PAYLOAD" });
      }

      const { jobId, tenantId } = parsed.data;

      try {
        request.log.info({ jobId, tenantId }, "Processing AI chat job");
        await processAiChatJob(opts, tenantId, jobId);
        return reply.status(200).send({ success: true });
      } catch (error) {
        if (error instanceof PermanentTaskError) {
          request.log.warn(
            { jobId, tenantId, code: error.code },
            error.message,
          );
          return reply.status(200).send({ success: false, error: error.code });
        }

        request.log.error(
          { err: error, jobId, tenantId },
          "AI chat job failed",
        );
        return reply
          .status(500)
          .send({ success: false, error: "TRANSIENT_ERROR" });
      }
    },
  );
}
