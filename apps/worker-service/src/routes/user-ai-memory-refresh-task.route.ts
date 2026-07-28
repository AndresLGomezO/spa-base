import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";

import { AI_TASK_ROUTES } from "@repo/ai-engine/task-routes";
import type { WorkloadRunRecorder } from "@repo/workload-runs";

import {
  nightlyUserAiMemoryTaskPayloadSchema,
  processNightlyUserAiMemoryRefresh,
  processUserAiMemoryRefresh,
  refreshUserAiMemoryTaskPayloadSchema,
  type UserAiMemoryRefreshProcessorDeps,
} from "../services/user-ai-memory-refresh-processor.js";
import { readWorkloadRunLineageFromHeaders } from "../workloads/workload-run-context.js";
import { withWorkloadRun } from "../workloads/with-workload-run.js";

export async function userAiMemoryRefreshTaskRoute(
  app: FastifyInstance,
  deps: UserAiMemoryRefreshProcessorDeps & {
    readonly workloadRunRecorder?: WorkloadRunRecorder;
  },
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
        if (!deps.workloadRunRecorder) {
          await processUserAiMemoryRefresh(deps, tenantId, userId);
          return reply.status(200).send({ success: true });
        }
        const lineage = readWorkloadRunLineageFromHeaders(
          request.headers as Record<string, string | string[] | undefined>,
        );
        await withWorkloadRun(
          deps.workloadRunRecorder,
          {
            workloadId: "worker:refresh-user-ai-memory",
            triggeredBy: "cloudTasks",
            tenantId,
            parentRunId: lineage.parentRunId,
            rootRunId: lineage.rootRunId,
          },
          request.log,
          async () => {
            await processUserAiMemoryRefresh(deps, tenantId, userId);
          },
        );
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
        if (!deps.workloadRunRecorder) {
          const result = await processNightlyUserAiMemoryRefresh(
            deps,
            parsed.data.tenantId,
            parsed.data.sinceIso,
          );
          return reply.status(200).send({ success: true, ...result });
        }
        const lineage = readWorkloadRunLineageFromHeaders(
          request.headers as Record<string, string | string[] | undefined>,
        );
        const result = await withWorkloadRun(
          deps.workloadRunRecorder,
          {
            workloadId: "worker:nightly-user-ai-memory",
            triggeredBy: "http",
            tenantId: parsed.data.tenantId,
            parentRunId: lineage.parentRunId,
            rootRunId: lineage.rootRunId,
          },
          request.log,
          async () =>
            processNightlyUserAiMemoryRefresh(
              deps,
              parsed.data.tenantId,
              parsed.data.sinceIso,
            ),
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
