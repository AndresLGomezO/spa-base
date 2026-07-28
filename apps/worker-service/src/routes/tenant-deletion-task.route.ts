import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";

import type { WorkloadRunRecorder } from "@repo/workload-runs";

import { HOOK_TASK_ROUTES } from "../hooks/hook-task-routes.js";
import { dispatchHookTaskAsync } from "./dispatch-hook-task-async.js";
import {
  processTenantDeletionTask,
  tenantDeletionTaskPayloadSchema,
  type TenantDeletionProcessorRouteDeps,
} from "../services/tenant-deletion-processor.js";
import { readWorkloadRunLineageFromHeaders } from "../workloads/workload-run-context.js";
import { withWorkloadRun } from "../workloads/with-workload-run.js";

export type TenantDeletionTaskRouteDeps = TenantDeletionProcessorRouteDeps & {
  readonly workloadRunRecorder?: WorkloadRunRecorder;
};

export async function tenantDeletionTaskRoute(
  app: FastifyInstance,
  deps: TenantDeletionTaskRouteDeps,
): Promise<void> {
  app.post(
    HOOK_TASK_ROUTES.DELETE_TENANT,
    async (request: FastifyRequest, reply: FastifyReply) => {
      const parsed = tenantDeletionTaskPayloadSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({
          success: false,
          message: "Invalid tenant deletion task payload.",
        });
      }

      return dispatchHookTaskAsync({
        request,
        reply,
        tenantId: parsed.data.tenantId,
        hookId: "delete-tenant",
        logLabel: "Processing tenant deletion",
        // Keep the request open so Cloud Run CPU stays allocated until purge
        // finishes. Fire-and-forget left jobs stuck in `running` mid-archive.
        awaitCompletion: true,
        process: async () => {
          if (!deps.workloadRunRecorder) {
            return processTenantDeletionTask(deps, parsed.data);
          }
          const lineage = readWorkloadRunLineageFromHeaders(
            request.headers as Record<string, string | string[] | undefined>,
          );
          await withWorkloadRun(
            deps.workloadRunRecorder,
            {
              workloadId: "worker:delete-tenant",
              triggeredBy: "cloudTasks",
              tenantId: parsed.data.tenantId,
              triggerContext: { taskCategory: "tenant-deletion" },
              parentRunId: lineage.parentRunId,
              rootRunId: lineage.rootRunId,
            },
            request.log,
            async (handle) => {
              await processTenantDeletionTask(deps, parsed.data);
              await handle.addArtifact({
                kind: "tenantDeletionJob",
                id: parsed.data.tenantId,
                tenantId: parsed.data.tenantId,
              });
            },
          );
        },
      });
    },
  );
}
