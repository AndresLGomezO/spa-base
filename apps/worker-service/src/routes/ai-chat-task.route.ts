import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";

import { AI_TASK_ROUTES } from "@repo/ai-engine/task-routes";
import type { WorkloadRunRecorder } from "@repo/workload-runs";

import { dispatchAiTaskAsync } from "./dispatch-ai-task-async.js";
import type { AiChatProcessorDeps } from "../services/ai-chat-processor.js";
import {
  processAiChatJob,
  processAiChatTaskPayloadSchema,
} from "../services/ai-chat-processor.js";
import { readWorkloadRunLineageFromHeaders } from "../workloads/workload-run-context.js";
import { withWorkloadRun } from "../workloads/with-workload-run.js";

export async function aiChatTaskRoute(
  app: FastifyInstance,
  opts: AiChatProcessorDeps & { readonly workloadRunRecorder?: WorkloadRunRecorder },
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

      return dispatchAiTaskAsync({
        request,
        reply,
        aiJobRepository: opts.aiJobRepository,
        tenantId,
        jobId,
        logLabel: "Processing AI chat job",
        process: async () => {
          if (!opts.workloadRunRecorder) {
            return processAiChatJob(opts, tenantId, jobId);
          }
          const lineage = readWorkloadRunLineageFromHeaders(
            request.headers as Record<string, string | string[] | undefined>,
          );
          await withWorkloadRun(
            opts.workloadRunRecorder,
            {
              workloadId: "worker:process-ai-chat",
              triggeredBy: "cloudTasks",
              tenantId,
              parentRunId: lineage.parentRunId,
              rootRunId: lineage.rootRunId,
            },
            request.log,
            async (handle) => {
              await processAiChatJob(opts, tenantId, jobId);
              await handle.addArtifact({ kind: "aiJob", id: jobId, tenantId });
            },
          );
        },
      });
    },
  );
}
