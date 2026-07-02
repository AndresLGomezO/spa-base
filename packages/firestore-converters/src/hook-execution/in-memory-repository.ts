import {
  createDataHookExecutionInputSchema,
  dataHookExecutionRecordSchema,
  type DataHookExecutionRecord,
} from "@repo/hooks";
import { nanoid } from "nanoid";

import type { DataHookExecutionRepository } from "./repository-contract.js";
import {
  buildHookExecutionNextCursor,
  type HookExecutionListCursor,
} from "./pagination.js";
import { summarizeActiveExecutions } from "./summarize-active-executions.js";

const ACTIVE_STATUSES = new Set(["pending", "running"]);

function sortExecutionsByStartedAtDesc(
  records: readonly DataHookExecutionRecord[],
): DataHookExecutionRecord[] {
  return [...records].sort((left, right) => {
    const startedCompare = right.startedAt.localeCompare(left.startedAt);
    if (startedCompare !== 0) {
      return startedCompare;
    }
    return right.id.localeCompare(left.id);
  });
}

function isBeforeCursor(
  record: DataHookExecutionRecord,
  cursor: HookExecutionListCursor,
): boolean {
  const startedCompare = record.startedAt.localeCompare(cursor.startedAt);
  if (startedCompare < 0) {
    return true;
  }
  if (startedCompare > 0) {
    return false;
  }
  return record.id.localeCompare(cursor.id) < 0;
}

function paginateExecutions(
  records: readonly DataHookExecutionRecord[],
  options?: {
    readonly limit?: number;
    readonly cursor?: HookExecutionListCursor | null;
  },
) {
  const limit = options?.limit ?? 50;
  const filtered = options?.cursor
    ? records.filter((record) => isBeforeCursor(record, options.cursor!))
    : [...records];
  const items = sortExecutionsByStartedAtDesc(filtered).slice(0, limit);
  return {
    items,
    nextCursor: buildHookExecutionNextCursor(items, limit),
  };
}

export function createInMemoryDataHookExecutionRepository(): DataHookExecutionRepository & {
  readonly store: Map<string, DataHookExecutionRecord>;
} {
  const store = new Map<string, DataHookExecutionRecord>();

  function key(tenantId: string, id: string): string {
    return `${tenantId}:${id}`;
  }

  function tenantRecords(tenantId: string): DataHookExecutionRecord[] {
    return [...store.values()].filter((record) => record.tenantId === tenantId);
  }

  return {
    store,
    async create(tenantId, input, options) {
      const parsed = createDataHookExecutionInputSchema.parse(input);
      const record = dataHookExecutionRecordSchema.parse({
        id: options?.id ?? `hookexec_${nanoid(12)}`,
        tenantId,
        ...parsed,
      });
      store.set(key(tenantId, record.id), record);
      return record;
    },
    async update(tenantId, id, patch) {
      const current = store.get(key(tenantId, id));
      if (!current) {
        throw new Error(`Data hook execution not found: ${id}`);
      }
      const next = dataHookExecutionRecordSchema.parse({
        ...current,
        ...patch,
      });
      store.set(key(tenantId, id), next);
      return next;
    },
    async listByHookId(tenantId, hookId, options) {
      return paginateExecutions(
        tenantRecords(tenantId).filter((record) => record.hookId === hookId),
        options,
      );
    },
    async listRecent(tenantId, options) {
      return paginateExecutions(tenantRecords(tenantId), options);
    },
    async listActive(tenantId) {
      return tenantRecords(tenantId)
        .filter((record) => ACTIVE_STATUSES.has(record.status))
        .sort((left, right) => right.startedAt.localeCompare(left.startedAt));
    },
    async countActiveByStatus(tenantId) {
      return summarizeActiveExecutions(await this.listActive(tenantId));
    },
  };
}
