import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";

import { HOOK_TASK_ROUTES } from "../hooks/hook-task-routes.js";
import { createWorkerHookLogger } from "../hooks/create-worker-hook-logger.js";
import { dispatchHookTaskAsync } from "./dispatch-hook-task-async.js";
import { processScheduleTick } from "../services/schedule-tick-processor.js";
import type { DataHookProcessorDeps } from "../services/data-hook-processor.js";
import type { FirebaseAdminConfig } from "@repo/gcp-firebase";

import { scheduleTickConfig } from "../config/env.js";

export type ScheduleTickRouteDeps = DataHookProcessorDeps & {
  readonly firebaseAdminConfig: FirebaseAdminConfig;
  readonly indexProjectId: string;
  readonly indexDatabaseId?: string;
};

export async function scheduleTickRoute(
  app: FastifyInstance,
  deps: ScheduleTickRouteDeps,
): Promise<void> {
  app.post(
    HOOK_TASK_ROUTES.SCHEDULE_TICK,
    async (request: FastifyRequest, reply: FastifyReply) => {
      const logger = createWorkerHookLogger(
        request.log,
        "platform",
        deps.hookLogMessageRepository,
      );

      return dispatchHookTaskAsync({
        request,
        reply,
        tenantId: "platform",
        hookId: "schedule-tick",
        logLabel: "Processing schedule tick",
        process: () =>
          processScheduleTick(deps, {
            firebaseAdminConfig: deps.firebaseAdminConfig,
            scheduledHookUserUid: scheduleTickConfig.scheduledHookUserUid,
            at: new Date(),
            logger,
          }),
      });
    },
  );
}
