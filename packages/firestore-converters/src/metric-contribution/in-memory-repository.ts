import {
  metricContributionRecordSchema,
  type MetricContributionRecord,
  type MetricContributionRepository,
} from "./repository-contract.js";

export function createInMemoryMetricContributionRepository(): MetricContributionRepository & {
  readonly store: Map<string, MetricContributionRecord>;
} {
  const store = new Map<string, MetricContributionRecord>();

  function key(
    tenantId: string,
    metricDefinitionId: string,
    documentId: string,
  ): string {
    return `${tenantId}:${metricDefinitionId}:${documentId}`;
  }

  return {
    store,
    async hasContributed(tenantId, metricDefinitionId, documentId) {
      return store.has(key(tenantId, metricDefinitionId, documentId));
    },
    async markContributed(
      tenantId,
      metricDefinitionId,
      documentId,
      lastEventId,
    ) {
      const now = new Date().toISOString();
      const record = metricContributionRecordSchema.parse({
        id: documentId,
        tenantId,
        metricDefinitionId,
        documentId,
        firstContributedAt: now,
        lastEventId,
      });
      store.set(key(tenantId, metricDefinitionId, documentId), record);
    },
    async markContributedBatch(
      tenantId,
      metricDefinitionId,
      documentIds,
      lastEventId,
    ) {
      const now = new Date().toISOString();
      for (const documentId of documentIds) {
        const record = metricContributionRecordSchema.parse({
          id: documentId,
          tenantId,
          metricDefinitionId,
          documentId,
          firstContributedAt: now,
          lastEventId,
        });
        store.set(key(tenantId, metricDefinitionId, documentId), record);
      }
    },
    async clearContribution(tenantId, metricDefinitionId, documentId) {
      store.delete(key(tenantId, metricDefinitionId, documentId));
    },
    async clearForMetric(tenantId, metricDefinitionId) {
      const prefix = `${tenantId}:${metricDefinitionId}:`;
      for (const entryKey of [...store.keys()]) {
        if (entryKey.startsWith(prefix)) {
          store.delete(entryKey);
        }
      }
    },
  };
}
