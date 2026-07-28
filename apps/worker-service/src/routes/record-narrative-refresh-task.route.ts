import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";

import { AI_TASK_ROUTES } from "@repo/ai-engine/task-routes";
import type { WorkloadRunRecorder } from "@repo/workload-runs";

import type { RecordNarrativeRefreshProcessor } from "../services/record-narrative-refresh-processor.js";
import { readWorkloadRunLineageFromHeaders } from "../workloads/workload-run-context.js";
import { withWorkloadRun } from "../workloads/with-workload-run.js";

const payloadSchema = z.object({
  tenantId: z.string().trim().min(1),
  entityName: z.string().trim().min(1),
  recordId: z.string().trim().min(1),
  variant: z.string().trim().min(1).optional(),
  prompt: z.string().optional(),
  systemInstruction: z.string().optional(),
});

export async function recordNarrativeRefreshTaskRoute(
  app: FastifyInstance,
  deps: {
    readonly refreshNarrative: RecordNarrativeRefreshProcessor;
    readonly workloadRunRecorder?: WorkloadRunRecorder;
  },
): Promise<void> {
  app.post(
    AI_TASK_ROUTES.REFRESH_RECORD_NARRATIVE,
    async (request: FastifyRequest, reply: FastifyReply) => {
      const parsed = payloadSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply
          .status(200)
          .send({ success: false, error: "INVALID_PAYLOAD" });
      }
      try {
        if (!deps.workloadRunRecorder) {
          await deps.refreshNarrative(parsed.data);
          return reply.status(200).send({ success: true });
        }
        const lineage = readWorkloadRunLineageFromHeaders(
          request.headers as Record<string, string | string[] | undefined>,
        );
        await withWorkloadRun(
          deps.workloadRunRecorder,
          {
            workloadId: "worker:refresh-record-narrative",
            triggeredBy: "cloudTasks",
            tenantId: parsed.data.tenantId,
            parentRunId: lineage.parentRunId,
            rootRunId: lineage.rootRunId,
          },
          request.log,
          async () => {
            await deps.refreshNarrative(parsed.data);
          },
        );
        return reply.status(200).send({ success: true });
      } catch (error) {
        request.log.error(
          { err: error, ...parsed.data },
          "Record narrative refresh failed",
        );
        return reply
          .status(200)
          .send({ success: false, error: "PROCESSING_FAILED" });
      }
    },
  );
}
