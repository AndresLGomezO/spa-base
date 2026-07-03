import fastify, { type FastifyInstance, type FastifyRequest } from "fastify";

import type { WorkerTaskScopeDeps } from "./routes/task.scope.js";
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
  deps: WorkerTaskScopeDeps,
): Promise<FastifyInstance> {
  const app = fastify({ logger: true });
  registerLenientJsonParser(app);

  await app.register(healthRoute, { hookRuntime: deps.hookRuntime });
  await app.register(taskScope, deps);

  return app;
}
