import type { FastifyInstance } from "fastify";

import type { AiChatProcessorDeps } from "../services/ai-chat-processor.js";
import { oidcAuthHook } from "../middleware/oidc-auth.middleware.js";
import { aiChatTaskRoute } from "./ai-chat-task.route.js";

export async function taskScope(
  app: FastifyInstance,
  deps: AiChatProcessorDeps,
): Promise<void> {
  app.addHook("preHandler", oidcAuthHook);
  await app.register(aiChatTaskRoute, deps);
}
