import type { MetricDefinitionRecord } from "@repo/metrics-engine";

export interface MetricDefinitionSource {
  listActive(tenantId: string): Promise<readonly MetricDefinitionRecord[]>;
}

export interface ActiveMetricIndex {
  hasActiveMetrics(tenantId: string, sourceModel: string): Promise<boolean>;
  getActiveSourceModels(tenantId: string): Promise<ReadonlySet<string>>;
  invalidate(tenantId: string): void;
}

export function createActiveMetricIndex(
  source: MetricDefinitionSource,
): ActiveMetricIndex {
  const cache = new Map<string, ReadonlySet<string>>();

  async function load(tenantId: string): Promise<ReadonlySet<string>> {
    const cached = cache.get(tenantId);
    if (cached) {
      return cached;
    }

    const definitions = await source.listActive(tenantId);
    const models = new Set(
      definitions.map((definition) => definition.sourceModel),
    );
    cache.set(tenantId, models);
    return models;
  }

  return {
    async hasActiveMetrics(tenantId, sourceModel) {
      const models = await load(tenantId);
      return models.has(sourceModel);
    },
    async getActiveSourceModels(tenantId) {
      return load(tenantId);
    },
    invalidate(tenantId) {
      cache.delete(tenantId);
    },
  };
}
