import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";

import { AI_TASK_ROUTES } from "@repo/ai-engine/task-routes";

import type { RecordNarrativeRefreshProcessor } from "../services/record-narrative-refresh-processor.js";

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
  deps: { readonly refreshNarrative: RecordNarrativeRefreshProcessor },
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
        await deps.refreshNarrative(parsed.data);
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
