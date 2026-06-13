import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";

import { AI_TASK_ROUTES } from "@repo/ai-engine/task-routes";

import { dispatchAiTaskAsync } from "./dispatch-ai-task-async.js";
import type { AiUiBuilderProcessorDeps } from "../services/ai-ui-builder-processor.js";
import {
  processAiUiBuilderJob,
  processAiUiBuilderTaskPayloadSchema,
} from "../services/ai-ui-builder-processor.js";

export async function aiUiBuilderTaskRoute(
  app: FastifyInstance,
  opts: AiUiBuilderProcessorDeps,
): Promise<void> {
  app.post(
    AI_TASK_ROUTES.PROCESS_AI_UI_BUILDER,
    async (request: FastifyRequest, reply: FastifyReply) => {
      const parsed = processAiUiBuilderTaskPayloadSchema.safeParse(
        request.body,
      );
      if (!parsed.success) {
        request.log.warn(
          { validation: parsed.error.flatten() },
          "Invalid AI UI builder task payload",
        );
        return reply
          .status(200)
          .send({ success: false, error: "INVALID_PAYLOAD" });
      }

      const { jobId, tenantId } = parsed.data;

      return dispatchAiTaskAsync({
        request,
        reply,
        aiJobRepository: opts.aiJobRepository,
        tenantId,
        jobId,
        logLabel: "Processing AI UI builder job",
        process: () => processAiUiBuilderJob(opts, tenantId, jobId),
      });
    },
  );
}
