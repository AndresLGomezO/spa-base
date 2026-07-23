import {
  createHookLogMessageInputSchema,
  hookLogMessageRecordSchema,
  type HookLogMessageRecord,
} from "@repo/debug-logs";
import { nanoid } from "nanoid";

import { isIsoWithinTimeRange } from "../list-recent-time-range.js";
import type { HookLogMessageRepository } from "./repository-contract.js";

export function createInMemoryHookLogMessageRepository(): HookLogMessageRepository & {
  readonly store: Map<string, HookLogMessageRecord>;
} {
  const store = new Map<string, HookLogMessageRecord>();

  function key(tenantId: string, id: string): string {
    return `${tenantId}:${id}`;
  }

  return {
    store,
    async create(tenantId, input) {
      const parsed = createHookLogMessageInputSchema.parse(input);
      const record = hookLogMessageRecordSchema.parse({
        id: `hooklog_${nanoid(12)}`,
        tenantId,
        ...parsed,
      });
      store.set(key(tenantId, record.id), record);
      return record;
    },
    async listRecent(tenantId, options) {
      const limit = options?.limit ?? 50;
      return [...store.values()]
        .filter((record) => record.tenantId === tenantId)
        .filter((record) => isIsoWithinTimeRange(record.timestamp, options))
        .sort((left, right) => right.timestamp.localeCompare(left.timestamp))
        .slice(0, limit);
    },
  };
}
