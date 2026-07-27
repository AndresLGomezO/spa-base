import {
  dataHookAiCacheRecordSchema,
  type DataHookAiCacheRecord,
} from "@repo/ai-engine/schemas";

import type { DataHookAiCacheRepository } from "./repository-contract.js";

export function createInMemoryDataHookAiCacheRepository(): DataHookAiCacheRepository & {
  readonly records: Map<string, DataHookAiCacheRecord>;
} {
  const records = new Map<string, DataHookAiCacheRecord>();

  function key(tenantId: string, id: string): string {
    return `${tenantId}:${id}`;
  }

  return {
    records,
    async getById(tenantId, id) {
      return records.get(key(tenantId, id)) ?? null;
    },
    async upsert(record) {
      const next = dataHookAiCacheRecordSchema.parse(record);
      records.set(key(next.tenantId, next.id), next);
      return next;
    },
  };
}
