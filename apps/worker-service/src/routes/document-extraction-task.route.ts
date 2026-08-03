import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";

import { AI_TASK_ROUTES } from "@repo/ai-engine/task-routes";
import type { WorkloadRunRecorder } from "@repo/workload-runs";

import type { DocumentExtractionProcessor } from "../services/document-extraction-processor.js";
import { readWorkloadRunLineageFromHeaders } from "../workloads/workload-run-context.js";
import { withWorkloadRun } from "../workloads/with-workload-run.js";

const payloadSchema = z.object({
  tenantId: z.string().trim().min(1),
  attachmentId: z.string().trim().min(1),
  templateId: z.string().trim().min(1).optional(),
  requestedBy: z.string().trim().min(1).optional(),
});

export async function documentExtractionTaskRoute(
  app: FastifyInstance,
  deps: {
    readonly processDocumentExtraction: DocumentExtractionProcessor;
    readonly workloadRunRecorder?: WorkloadRunRecorder;
  },
): Promise<void> {
  app.post(
    AI_TASK_ROUTES.PROCESS_DOCUMENT_EXTRACTION,
    async (request: FastifyRequest, reply: FastifyReply) => {
      const parsed = payloadSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply
          .status(200)
          .send({ success: false, error: "INVALID_PAYLOAD" });
      }
      try {
        if (!deps.workloadRunRecorder) {
          await deps.processDocumentExtraction(parsed.data);
          return reply.status(200).send({ success: true });
        }
        const lineage = readWorkloadRunLineageFromHeaders(
          request.headers as Record<string, string | string[] | undefined>,
        );
        await withWorkloadRun(
          deps.workloadRunRecorder,
          {
            workloadId: "worker:process-document-extraction",
            triggeredBy: "cloudTasks",
            tenantId: parsed.data.tenantId,
            parentRunId: lineage.parentRunId,
            rootRunId: lineage.rootRunId,
          },
          request.log,
          async () => {
            await deps.processDocumentExtraction(parsed.data);
          },
        );
        return reply.status(200).send({ success: true });
      } catch (error) {
        request.log.error(
          { err: error, ...parsed.data },
          "Document extraction failed",
        );
        return reply
          .status(200)
          .send({ success: false, error: "PROCESSING_FAILED" });
      }
    },
  );
}
