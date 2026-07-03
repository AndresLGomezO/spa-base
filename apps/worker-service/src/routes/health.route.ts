import type { FastifyInstance } from "fastify";
import { z } from "zod";

import { workerEnv } from "../config/env.js";
import type { HookRuntimeContext } from "../hooks/worker-hook-runtime-context.js";

const reloadHookCacheBodySchema = z.object({
  tenantId: z.string().trim().min(1),
});

function isDevHookCacheReloadEnabled(): boolean {
  return (
    process.env.NODE_ENV !== "production" &&
    Boolean(workerEnv.FIRESTORE_EMULATOR_HOST)
  );
}

export async function healthRoute(
  app: FastifyInstance,
  options?: { readonly hookRuntime?: HookRuntimeContext },
): Promise<void> {
  app.get("/health", async () => ({ status: "ok" }));

  if (!isDevHookCacheReloadEnabled() || !options?.hookRuntime) {
    return;
  }

  app.post("/dev/reload-hook-cache", async (request, reply) => {
    const parsed = reloadHookCacheBodySchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: "INVALID_BODY" });
    }

    await options.hookRuntime.reloadTenantHooks(parsed.data.tenantId);
    return reply.send({ success: true });
  });
}
