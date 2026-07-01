import { createPersistingHookLogger } from "@repo/debug-logs";
import type { HookLogger } from "@repo/hooks";
import type { HookLogMessageRepository } from "@repo/firestore-converters";
import type { FastifyBaseLogger } from "fastify";

export function createWorkerHookLogger(
  log: FastifyBaseLogger,
  tenantId: string,
  hookLogMessageRepository?: HookLogMessageRepository,
): HookLogger {
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
