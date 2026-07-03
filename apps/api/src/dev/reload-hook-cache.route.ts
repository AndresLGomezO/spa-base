import type { FastifyInstance } from "fastify";
import { z } from "zod";

import { apiEnv } from "../config/env.js";
import type { HookRuntimeContext } from "../hooks/hook-runtime-context.js";

const reloadHookCacheBodySchema = z.object({
  tenantId: z.string().trim().min(1),
});

export function isDevHookCacheReloadEnabled(): boolean {
  return (
    process.env.NODE_ENV !== "production" &&
    Boolean(apiEnv.FIRESTORE_EMULATOR_HOST)
  );
}

export async function reloadHookCacheRoute(
  app: FastifyInstance,
  options: { readonly hookRuntime: HookRuntimeContext },
): Promise<void> {
  if (!isDevHookCacheReloadEnabled()) {
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
