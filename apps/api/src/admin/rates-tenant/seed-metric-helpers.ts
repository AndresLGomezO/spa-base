import type {
  CreateMetricDefinitionInput,
  MetricDefinitionRecord,
  PatchMetricDefinitionInput,
} from "@repo/metrics-engine";
import type { MetricDefinitionRepository } from "@repo/firestore-converters";

function stableJson(value: unknown): string {
  return JSON.stringify(value);
}

function metricNeedsSync(
  existing: MetricDefinitionRecord,
  desired: CreateMetricDefinitionInput,
): boolean {
  return (
    existing.name !== desired.name ||
    (existing.description ?? "") !== (desired.description ?? "") ||
    existing.sourceModel !== desired.sourceModel ||
    existing.status !== desired.status ||
    existing.valueDisplayFormat !== desired.valueDisplayFormat ||
    stableJson(existing.filters) !== stableJson(desired.filters) ||
    stableJson(existing.groupBy) !== stableJson(desired.groupBy) ||
    stableJson(existing.dimensions) !== stableJson(desired.dimensions) ||
    stableJson(existing.dateFieldGranularity) !==
      stableJson(desired.dateFieldGranularity) ||
    stableJson(existing.aggregations) !== stableJson(desired.aggregations) ||
    stableJson(existing.fieldsDependency) !==
      stableJson(desired.fieldsDependency)
  );
}

function toPatchInput(
  existing: MetricDefinitionRecord,
  desired: CreateMetricDefinitionInput,
): PatchMetricDefinitionInput {
  return {
    name: desired.name,
    description: desired.description,
    filters: desired.filters,
    groupBy: desired.groupBy,
    dimensions: desired.dimensions,
    dateFieldGranularity: desired.dateFieldGranularity,
    valueDisplayFormat: desired.valueDisplayFormat,
    aggregations: desired.aggregations,
    fieldsDependency: desired.fieldsDependency,
    status: desired.status,
    version: existing.version + 1,
    schemaVersionDependency: desired.schemaVersionDependency,
  };
}

interface SeedRatesMetricsResult {
  readonly created: number;
  readonly updated: number;
  readonly skipped: number;
  readonly records: readonly MetricDefinitionRecord[];
}

export async function seedRatesMetrics(
  tenantId: string,
  repository: MetricDefinitionRepository,
  definitions: readonly CreateMetricDefinitionInput[],
): Promise<SeedRatesMetricsResult> {
  const existing = await repository.list(tenantId);
  const byName = new Map(existing.map((item) => [item.name, item]));

  let created = 0;
  let updated = 0;
  let skipped = 0;
  const records: MetricDefinitionRecord[] = [];

  for (const definition of definitions) {
    const current = byName.get(definition.name);
    if (current) {
      if (metricNeedsSync(current, definition)) {
        const record = await repository.update(
          tenantId,
          current.id,
          toPatchInput(current, definition),
        );
        records.push(record);
        byName.set(record.name, record);
        updated += 1;
      } else {
        records.push(current);
        skipped += 1;
      }
      continue;
    }

    const record = await repository.create(tenantId, definition);
    records.push(record);
    byName.set(record.name, record);
    created += 1;
  }

  return { created, updated, skipped, records };
}
