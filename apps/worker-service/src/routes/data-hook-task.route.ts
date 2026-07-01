import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";

import { HOOK_TASK_ROUTES } from "../hooks/hook-task-routes.js";
import { dispatchHookTaskAsync } from "./dispatch-hook-task-async.js";
import { createWorkerHookLogger } from "../hooks/create-worker-hook-logger.js";
import {
  processDataHookJob,
  dataHookJobPayloadSchema,
  type DataHookProcessorDeps,
} from "../services/data-hook-processor.js";

export async function dataHookTaskRoute(
  app: FastifyInstance,
  deps: DataHookProcessorDeps,
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
        process: () => processDataHookJob(deps, payload, logger),
      });
    },
  );
}
