import {
  createDataHookExecutionInputSchema,
  dataHookExecutionRecordSchema,
  type DataHookExecutionRecord,
} from "@repo/hooks";
import { nanoid } from "nanoid";

import type { DataHookExecutionRepository } from "./repository-contract.js";

export function createInMemoryDataHookExecutionRepository(): DataHookExecutionRepository & {
  readonly store: Map<string, DataHookExecutionRecord>;
} {
  const store = new Map<string, DataHookExecutionRecord>();

  function key(tenantId: string, id: string): string {
    return `${tenantId}:${id}`;
  }

  return {
    store,
    async create(tenantId, input) {
      const parsed = createDataHookExecutionInputSchema.parse(input);
      const record = dataHookExecutionRecordSchema.parse({
        id: `hookexec_${nanoid(12)}`,
        tenantId,
        ...parsed,
      });
      store.set(key(tenantId, record.id), record);
      return record;
    },
    async listByHookId(tenantId, hookId, options) {
      const limit = options?.limit ?? 50;
      return [...store.values()]
        .filter(
          (record) => record.tenantId === tenantId && record.hookId === hookId,
        )
        .sort((left, right) => right.startedAt.localeCompare(left.startedAt))
        .slice(0, limit);
    },
    async listRecent(tenantId, options) {
      const limit = options?.limit ?? 50;
      return [...store.values()]
        .filter((record) => record.tenantId === tenantId)
        .sort((left, right) => right.startedAt.localeCompare(left.startedAt))
        .slice(0, limit);
    },
  };
}
