import {
  createMetricDefinitionInputSchema,
  generateMetricTargetCollection,
  metricDefinitionRecordSchema,
  patchMetricDefinitionInputSchema,
  type MetricDefinitionRecord,
} from "@repo/metrics-engine";
import { nanoid } from "nanoid";

import type { MetricDefinitionRepository } from "./repository-contract.js";

export function createInMemoryMetricDefinitionRepository(): MetricDefinitionRepository & {
  readonly store: Map<string, MetricDefinitionRecord>;
} {
  const store = new Map<string, MetricDefinitionRecord>();

  function key(tenantId: string, id: string): string {
    return `${tenantId}:${id}`;
  }

  return {
    store,
    async list(tenantId) {
      return [...store.values()].filter(
        (record) => record.tenantId === tenantId,
      );
    },
    async listActive(tenantId) {
      return (await this.list(tenantId)).filter(
        (record) => record.status === "ACTIVE",
      );
    },
    async getById(tenantId, id) {
      return store.get(key(tenantId, id)) ?? null;
    },
    async create(tenantId, input) {
      const parsed = createMetricDefinitionInputSchema.parse(input);
      const now = new Date().toISOString();
      const id = `metric_${nanoid(12)}`;
      const record = metricDefinitionRecordSchema.parse({
        id,
        tenantId,
        metricId: parsed.name.toLowerCase().replace(/\s+/g, "_"),
        name: parsed.name,
        ...(parsed.description ? { description: parsed.description } : {}),
        sourceModel: parsed.sourceModel,
        ...(parsed.sourceQueryDefinitionId
          ? { sourceQueryDefinitionId: parsed.sourceQueryDefinitionId }
          : {}),
        filters: parsed.filters,
        groupBy: parsed.groupBy,
        dimensions: parsed.dimensions,
        dateFieldGranularity: parsed.dateFieldGranularity,
        valueDisplayFormat: parsed.valueDisplayFormat,
        computationMode: parsed.computationMode,
        parameters: parsed.parameters,
        ...(parsed.computation ? { computation: parsed.computation } : {}),
        aggregations: parsed.aggregations,
        target: {
          collection: generateMetricTargetCollection(id),
          granularity: parsed.target?.granularity ?? "dynamic",
        },
        version: parsed.version,
        schemaVersionDependency: parsed.schemaVersionDependency,
        fieldsDependency: parsed.fieldsDependency,
        status: parsed.status,
        createdAt: now,
        updatedAt: now,
      });
      store.set(key(tenantId, id), record);
      return record;
    },
    async update(tenantId, id, input) {
      const current = store.get(key(tenantId, id));
      if (!current) {
        throw new Error(`Metric definition not found: ${id}`);
      }

      patchMetricDefinitionInputSchema.parse(input);
      const now = new Date().toISOString();
      const next = metricDefinitionRecordSchema.parse({
        ...current,
        ...(input.name ? { name: input.name } : {}),
        ...(input.description !== undefined
          ? { description: input.description }
          : {}),
        ...(input.filters ? { filters: input.filters } : {}),
        ...(input.groupBy ? { groupBy: input.groupBy } : {}),
        ...(input.dimensions ? { dimensions: input.dimensions } : {}),
        ...(input.dateFieldGranularity !== undefined
          ? { dateFieldGranularity: input.dateFieldGranularity }
          : {}),
        ...(input.valueDisplayFormat !== undefined
          ? { valueDisplayFormat: input.valueDisplayFormat }
          : {}),
        ...(input.computationMode !== undefined
          ? { computationMode: input.computationMode }
          : {}),
        ...(input.parameters !== undefined
          ? { parameters: input.parameters }
          : {}),
        ...(input.computation !== undefined
          ? { computation: input.computation }
          : {}),
        ...(input.aggregations ? { aggregations: input.aggregations } : {}),
        ...(input.version !== undefined ? { version: input.version } : {}),
        ...(input.schemaVersionDependency !== undefined
          ? { schemaVersionDependency: input.schemaVersionDependency }
          : {}),
        ...(input.fieldsDependency
          ? { fieldsDependency: input.fieldsDependency }
          : {}),
        ...(input.status ? { status: input.status } : {}),
        updatedAt: now,
      });
      store.set(key(tenantId, id), next);
      return next;
    },
    async delete(tenantId, id) {
      store.delete(key(tenantId, id));
    },
    async countBySourceQueryDefinitionId(tenantId, entityQueryDefinitionId) {
      return [...store.values()].filter(
        (record) =>
          record.tenantId === tenantId &&
          record.sourceQueryDefinitionId === entityQueryDefinitionId,
      ).length;
    },
  };
}
