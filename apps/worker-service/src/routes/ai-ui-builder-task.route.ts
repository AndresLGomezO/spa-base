import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";

import { AI_TASK_ROUTES } from "@repo/ai-engine/task-routes";
import type { WorkloadRunRecorder } from "@repo/workload-runs";

import { dispatchAiTaskAsync } from "./dispatch-ai-task-async.js";
import type { AiUiBuilderProcessorDeps } from "../services/ai-ui-builder-processor.js";
import {
  processAiUiBuilderJob,
  processAiUiBuilderTaskPayloadSchema,
} from "../services/ai-ui-builder-processor.js";
import { readWorkloadRunLineageFromHeaders } from "../workloads/workload-run-context.js";
import { withWorkloadRun } from "../workloads/with-workload-run.js";

export async function aiUiBuilderTaskRoute(
  app: FastifyInstance,
  opts: AiUiBuilderProcessorDeps & {
    readonly workloadRunRecorder?: WorkloadRunRecorder;
  },
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
        process: async () => {
          if (!opts.workloadRunRecorder) {
            return processAiUiBuilderJob(opts, tenantId, jobId);
          }
          const lineage = readWorkloadRunLineageFromHeaders(
            request.headers as Record<string, string | string[] | undefined>,
          );
          await withWorkloadRun(
            opts.workloadRunRecorder,
            {
              workloadId: "worker:process-ai-ui-builder",
              triggeredBy: "cloudTasks",
              tenantId,
              parentRunId: lineage.parentRunId,
              rootRunId: lineage.rootRunId,
            },
            request.log,
            async (handle) => {
              await processAiUiBuilderJob(opts, tenantId, jobId);
              await handle.addArtifact({ kind: "aiJob", id: jobId, tenantId });
            },
          );
        },
      });
    },
  );
}
