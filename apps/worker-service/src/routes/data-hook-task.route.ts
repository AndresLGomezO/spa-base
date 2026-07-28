import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";

import type { WorkloadRunRecorder } from "@repo/workload-runs";

import { HOOK_TASK_ROUTES } from "../hooks/hook-task-routes.js";
import { dispatchHookTaskAsync } from "./dispatch-hook-task-async.js";
import { createWorkerHookLogger } from "../hooks/create-worker-hook-logger.js";
import {
  processDataHookJob,
  dataHookJobPayloadSchema,
  type DataHookProcessorDeps,
} from "../services/data-hook-processor.js";
import { readWorkloadRunLineageFromHeaders } from "../workloads/workload-run-context.js";
import { withWorkloadRun } from "../workloads/with-workload-run.js";

export async function dataHookTaskRoute(
  app: FastifyInstance,
  deps: DataHookProcessorDeps & { readonly workloadRunRecorder?: WorkloadRunRecorder },
): Promise<void> {
  app.post(
    HOOK_TASK_ROUTES.PROCESS_DATA_HOOK,
    async (request: FastifyRequest, reply: FastifyReply) => {
      const parsed = dataHookJobPayloadSchema.safeParse(request.body);
      if (!parsed.success) {
        request.log.warn(
          { validation: parsed.error.flatten() },
          "Invalid data hook task payload",
        );
        return reply
          .status(200)
          .send({ success: false, error: "INVALID_PAYLOAD" });
      }

      const payload = parsed.data;
      const logger = createWorkerHookLogger(
        request.log,
        payload.tenantId,
        deps.hookLogMessageRepository,
      );

      return dispatchHookTaskAsync({
        request,
        reply,
        tenantId: payload.tenantId,
        hookId: payload.hookId,
        logLabel: "Processing data hook job",
        process: async () => {
          if (!deps.workloadRunRecorder) {
            return processDataHookJob(deps, payload, logger);
          }
          const lineage = readWorkloadRunLineageFromHeaders(
            request.headers as Record<string, string | string[] | undefined>,
          );
          await withWorkloadRun(
            deps.workloadRunRecorder,
            {
              workloadId: "worker:process-data-hook",
              triggeredBy: "cloudTasks",
              tenantId: payload.tenantId,
              parentRunId: lineage.parentRunId,
              rootRunId: lineage.rootRunId,
            },
            request.log,
            async (handle) => {
              await processDataHookJob(deps, payload, logger);
              await handle.addArtifact({
                kind: "hookExecution",
                id: payload.hookId,
                tenantId: payload.tenantId,
              });
            },
          );
        },
      });
    },
  );
}
