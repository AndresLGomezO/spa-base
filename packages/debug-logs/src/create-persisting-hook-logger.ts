import type { HookLogger } from "@repo/hooks";

import type { CreateHookLogMessageInput } from "./hook-log-message.js";

export interface HookLogMessageWriter {
  create(tenantId: string, input: CreateHookLogMessageInput): Promise<unknown>;
}

function readMetaString(
  meta: Record<string, unknown> | undefined,
  key: string,
): string | undefined {
  const value = meta?.[key];
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : undefined;
}

export function createPersistingHookLogger(options: {
  readonly base: HookLogger;
  readonly repository: HookLogMessageWriter;
  readonly tenantId: string;
}): HookLogger {
  const persist = (
    input: Omit<CreateHookLogMessageInput, "timestamp"> & {
      readonly meta?: Record<string, unknown>;
    },
  ) => {
    const tenantId = readMetaString(input.meta, "tenantId") ?? options.tenantId;
    void options.repository
      .create(tenantId, {
        level: input.level,
        message: input.message,
        meta: input.meta,
        hookId: input.hookId,
        entityName: input.entityName,
        timestamp: new Date().toISOString(),
      })
      .catch(() => undefined);
  };

  return {
    info(message, meta) {
      options.base.info(message, meta);
      persist({
        level: "info",
        message,
        meta,
        hookId: readMetaString(meta, "hookId"),
        entityName: readMetaString(meta, "entityName"),
      });
    },
    error(message, meta) {
      options.base.error(message, meta);
      persist({
        level: "error",
        message,
        meta,
        hookId: readMetaString(meta, "hookId"),
        entityName: readMetaString(meta, "entityName"),
      });
    },
  };
}
