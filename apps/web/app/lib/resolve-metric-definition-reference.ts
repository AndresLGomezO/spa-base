import type { MetricDefinitionRecord } from "./api-client.js";

export function resolveMetricDefinitionDocumentId(
  metricDefinitionId: string,
  definitions: readonly MetricDefinitionRecord[],
): string | undefined {
  const normalized = metricDefinitionId.trim();
  if (normalized.length === 0) {
    return undefined;
  }

  if (definitions.some((item) => item.id === normalized)) {
    return normalized;
  }

  const byMetricId = definitions.find((item) => item.metricId === normalized);
  if (byMetricId) {
    return byMetricId.id;
  }

  const normalizedName = normalized.toLowerCase();
  const byName = definitions.find(
    (item) => item.name.trim().toLowerCase() === normalizedName,
  );
  if (byName) {
    return byName.id;
  }

  return normalized;
}

export function formatMetricDefinitionOptionLabel(
  metric: MetricDefinitionRecord,
): string {
  return `${metric.name} (${metric.sourceModel})`;
}
