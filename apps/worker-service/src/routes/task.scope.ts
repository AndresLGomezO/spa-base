import type { FastifyInstance } from "fastify";

import type { AiChatProcessorDeps } from "../services/ai-chat-processor.js";
import type { AiUiBuilderProcessorDeps } from "../services/ai-ui-builder-processor.js";
import { oidcAuthHook } from "../middleware/oidc-auth.middleware.js";
import { aiChatTaskRoute } from "./ai-chat-task.route.js";
import { aiUiBuilderTaskRoute } from "./ai-ui-builder-task.route.js";

export type WorkerTaskScopeDeps = AiChatProcessorDeps &
  AiUiBuilderProcessorDeps;

export async function taskScope(
  app: FastifyInstance,
  deps: WorkerTaskScopeDeps,
): Promise<void> {
  app.addHook("preHandler", oidcAuthHook);
  await app.register(aiChatTaskRoute, deps);
  await app.register(aiUiBuilderTaskRoute, deps);
}
