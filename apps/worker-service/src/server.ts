import fastify, { type FastifyInstance, type FastifyRequest } from "fastify";

import type { AiChatProcessorDeps } from "./services/ai-chat-processor.js";
import { healthRoute } from "./routes/health.route.js";
import { taskScope } from "./routes/task.scope.js";

function registerLenientJsonParser(app: FastifyInstance): void {
  app.removeContentTypeParser("application/json");
  app.addContentTypeParser(
    "application/json",
    { parseAs: "string" },
    (
      _req: FastifyRequest,
      body: string,
      done: (err: Error | null, body?: unknown) => void,
    ) => {
      const trimmed = body.trim();
      if (trimmed === "") {
        done(null, {});
        return;
      }
      try {
        done(null, JSON.parse(trimmed) as unknown);
      } catch (err) {
        done(err as Error, undefined);
      }
    },
  );
}

export async function buildWorkerServer(
  deps: AiChatProcessorDeps,
): Promise<FastifyInstance> {
  const app = fastify({ logger: true });
  registerLenientJsonParser(app);

  await app.register(healthRoute);
  await app.register(taskScope, deps);

  return app;
}
