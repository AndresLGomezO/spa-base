import { nanoid } from "nanoid";

import {
  backfillJobRecordSchema,
  type BackfillJobRecord,
} from "./repository-contract.js";
import type { BackfillJobRepository } from "./repository-contract.js";

export function createInMemoryBackfillJobRepository(): BackfillJobRepository & {
  readonly store: Map<string, BackfillJobRecord>;
} {
  const store = new Map<string, BackfillJobRecord>();

  function key(tenantId: string, id: string): string {
    return `${tenantId}:${id}`;
  }

  return {
    store,
    async create(tenantId, input) {
      const now = new Date().toISOString();
      const id = `backfill_${nanoid(12)}`;
      const record = backfillJobRecordSchema.parse({
        id,
        tenantId,
        metricDefinitionId: input.metricDefinitionId,
        sourceModel: input.sourceModel,
        status: "PENDING",
        processedEvents: 0,
        totalEvents: null,
        errorMessage: null,
        createdAt: now,
        updatedAt: now,
      });
      store.set(key(tenantId, id), record);
      return record;
    },
    async getById(tenantId, id) {
      return store.get(key(tenantId, id)) ?? null;
    },
    async update(tenantId, id, patch) {
      const current = store.get(key(tenantId, id));
      if (!current) {
        throw new Error(`Backfill job not found: ${id}`);
      }

      const next = backfillJobRecordSchema.parse({
        ...current,
        ...patch,
        updatedAt: new Date().toISOString(),
      });
      store.set(key(tenantId, id), next);
      return next;
    },
    async hasCompletedBackfillForMetric(tenantId, metricDefinitionId) {
      return [...store.values()].some(
        (record) =>
          record.tenantId === tenantId &&
          record.metricDefinitionId === metricDefinitionId &&
          record.status === "COMPLETED",
      );
    },
  };
}
