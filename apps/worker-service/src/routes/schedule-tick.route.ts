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

function parseForceFlag(request: FastifyRequest): boolean {
  const query = request.query as { force?: string } | undefined;
  if (query?.force === "1" || query?.force === "true") {
    return true;
  }
  const body = request.body as { force?: unknown } | undefined;
  return body?.force === true || body?.force === "true" || body?.force === 1;
}

function parseHookFilter(request: FastifyRequest): string | undefined {
  const query = request.query as { hook?: string } | undefined;
  const fromQuery = query?.hook?.trim();
  if (fromQuery) {
    return fromQuery;
  }
  const body = request.body as { hook?: unknown } | undefined;
  if (typeof body?.hook === "string" && body.hook.trim().length > 0) {
    return body.hook.trim();
  }
  return undefined;
}

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

      const forceRequested = parseForceFlag(request);
      const force = forceRequested && scheduleTickConfig.allowForce;
      if (forceRequested && !scheduleTickConfig.allowForce) {
        request.log.warn(
          "Ignoring schedule-tick force flag (SCHEDULE_TICK_ALLOW_FORCE=false).",
        );
      }
      const hookFilter =
        force || scheduleTickConfig.allowForce
          ? parseHookFilter(request)
          : undefined;

      return dispatchHookTaskAsync({
        request,
        reply,
        tenantId: "platform",
        hookId: "schedule-tick",
        logLabel: force
          ? "Processing forced schedule tick"
          : "Processing schedule tick",
        // Never await: categorize (and other eachRecord hooks) can run for
        // minutes under force; curl should get 202 and watch worker logs /
        // hook debugger instead.
        process: () =>
          processScheduleTick(deps, {
            firebaseAdminConfig: deps.firebaseAdminConfig,
            scheduledHookUserUid: scheduleTickConfig.scheduledHookUserUid,
            at: new Date(),
            logger,
            ...(force ? { force: true } : {}),
            ...(hookFilter ? { hookFilter } : {}),
          }),
      });
    },
  );
}
