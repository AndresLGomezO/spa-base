import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";

import { HOOK_TASK_ROUTES } from "../hooks/hook-task-routes.js";
import { dispatchHookTaskAsync } from "./dispatch-hook-task-async.js";
import {
  processTenantDeletionTask,
  tenantDeletionTaskPayloadSchema,
  type TenantDeletionProcessorRouteDeps,
} from "../services/tenant-deletion-processor.js";

export type TenantDeletionTaskRouteDeps = TenantDeletionProcessorRouteDeps;

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
        process: () => processTenantDeletionTask(deps, parsed.data),
      });
    },
  );
}
