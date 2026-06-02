import {
  metricValueRecordSchema,
  mergeAvgFieldsIntoValues,
  type MetricValueRecord,
} from "@repo/metrics-engine";

import type { MetricValueRepository } from "./repository-contract.js";

export function createInMemoryMetricValueRepository(): MetricValueRepository & {
  readonly store: Map<string, MetricValueRecord>;
} {
  const store = new Map<string, MetricValueRecord>();

  function key(tenantId: string, metricName: string, docId: string): string {
    return `${tenantId}:${metricName}:${docId}`;
  }

  return {
    store,
    async applyIncrements(tenantId, metricName, docId, payload) {
      const existing = store.get(key(tenantId, metricName, docId));
      const now = new Date().toISOString();
      const values = { ...(existing?.values ?? {}) };

      for (const [valueKey, delta] of Object.entries(payload.increments)) {
        values[valueKey] = (values[valueKey] ?? 0) + delta;
      }

      const valuesWithAvg = mergeAvgFieldsIntoValues(values);

      const record = metricValueRecordSchema.parse({
        id: docId,
        tenantId,
        metricName,
        group: payload.group,
        dimensions: payload.dimensions,
        values: valuesWithAvg,
        updatedAt: now,
      });
      store.set(key(tenantId, metricName, docId), record);
      return record;
    },
    async getById(tenantId, metricName, docId) {
      return store.get(key(tenantId, metricName, docId)) ?? null;
    },
    async deleteAllRows(tenantId, metricName) {
      const prefix = `${tenantId}:${metricName}:`;
      for (const entryKey of [...store.keys()]) {
        if (entryKey.startsWith(prefix)) {
          store.delete(entryKey);
        }
      }
    },
  };
}
