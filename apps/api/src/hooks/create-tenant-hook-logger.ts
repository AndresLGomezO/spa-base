import { createPersistingHookLogger } from "@repo/debug-logs";
import type { HookLogger } from "@repo/hooks";
import type { HookLogMessageRepository } from "@repo/firestore-converters";
import type { FastifyBaseLogger, FastifyInstance } from "fastify";

export function createTenantHookLogger(
  app: FastifyInstance | FastifyBaseLogger,
  tenantId: string,
  hookLogMessageRepository?: HookLogMessageRepository,
): HookLogger {
  const log = "log" in app ? app.log : app;
  const base: HookLogger = {
    info: (message, meta) => log.info(meta ?? {}, message),
    error: (message, meta) => log.error(meta ?? {}, message),
  };

  if (!hookLogMessageRepository) {
    return base;
  }

  return createPersistingHookLogger({
    base,
    repository: hookLogMessageRepository,
    tenantId,
  });
}
