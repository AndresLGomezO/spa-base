import type { MetricDefinitionRecord } from "../lib/api-client.js";

export function entityHasActiveMetrics(
  entityName: string,
  definitions: readonly MetricDefinitionRecord[],
  metricsStripConfigured = false,
): boolean {
  const hasActiveDefinition = definitions.some(
    (item) => item.status === "ACTIVE" && item.sourceModel === entityName,
  );
  if (hasActiveDefinition) {
    return true;
  }

  return metricsStripConfigured;
}
