import {
  createRequestPerfLogInputSchema,
  requestPerfLogRecordSchema,
  type RequestPerfLogRecord,
} from "@repo/debug-logs";
import { nanoid } from "nanoid";

import type { RequestPerfLogRepository } from "./repository-contract.js";

export function createInMemoryRequestPerfLogRepository(): RequestPerfLogRepository & {
  readonly store: Map<string, RequestPerfLogRecord>;
} {
  const store = new Map<string, RequestPerfLogRecord>();

  function key(tenantId: string, id: string): string {
    return `${tenantId}:${id}`;
  }

  return {
    store,
    async create(tenantId, input) {
      const parsed = createRequestPerfLogInputSchema.parse(input);
      const record = requestPerfLogRecordSchema.parse({
        id: `perf_${nanoid(12)}`,
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
        .sort((left, right) => right.timestamp.localeCompare(left.timestamp))
        .slice(0, limit);
    },
  };
}
