import type { FastifyInstance, FastifyRequest } from "fastify";
import { emitHooks } from "@repo/modules";

export async function emitEntityLifecycleHook(
  app: FastifyInstance,
  request: FastifyRequest,
  params: {
    readonly event: "created" | "updated" | "deleted";
    readonly entityName: string;
    readonly record: Record<string, unknown>;
  },
): Promise<void> {
  const ctx = request.ctx;
  if (!ctx?.uid || !ctx.tenantId) {
    return;
  }

  await emitHooks(`${params.entityName}.${params.event}`, {
    userId: ctx.uid,
    tenantId: ctx.tenantId,
    entityName: params.entityName,
    record: params.record,
    services: {
      logger: {
        info: (message, meta) => app.log.info(meta ?? {}, message),
        error: (message, meta) => app.log.error(meta ?? {}, message),
      },
    },
  });
}
