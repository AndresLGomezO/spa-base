import type { FastifyInstance } from "fastify";

import type { AiChatProcessorDeps } from "../services/ai-chat-processor.js";
import type { AiUiBuilderProcessorDeps } from "../services/ai-ui-builder-processor.js";
import type { DataHookProcessorDeps } from "../services/data-hook-processor.js";
import type { ScheduleTickRouteDeps } from "../routes/schedule-tick.route.js";
import type { TenantDeletionTaskRouteDeps } from "../routes/tenant-deletion-task.route.js";
import { oidcAuthHook } from "../middleware/oidc-auth.middleware.js";
import { aiChatTaskRoute } from "./ai-chat-task.route.js";
import { aiUiBuilderTaskRoute } from "./ai-ui-builder-task.route.js";
import { dataHookTaskRoute } from "./data-hook-task.route.js";
import { scheduleTickRoute } from "./schedule-tick.route.js";
import { tenantDeletionTaskRoute } from "./tenant-deletion-task.route.js";

export type WorkerTaskScopeDeps = AiChatProcessorDeps &
  AiUiBuilderProcessorDeps &
  DataHookProcessorDeps &
  ScheduleTickRouteDeps &
  TenantDeletionTaskRouteDeps;

export async function taskScope(
  app: FastifyInstance,
  deps: WorkerTaskScopeDeps,
): Promise<void> {
  app.addHook("preHandler", oidcAuthHook);
  await app.register(aiChatTaskRoute, deps);
  await app.register(aiUiBuilderTaskRoute, deps);
  await app.register(dataHookTaskRoute, deps);
  await app.register(scheduleTickRoute, deps);
  await app.register(tenantDeletionTaskRoute, deps);
}
