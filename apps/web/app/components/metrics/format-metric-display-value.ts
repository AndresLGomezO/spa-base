import { avgKeyForField } from "@repo/metrics-engine";

import type { MetricDefinitionRecord } from "../../lib/api-client.js";
import { formatMetricValueKey } from "../../lib/metric-query-utils.js";

export function formatPrimaryMetricValue(
  definition: MetricDefinitionRecord,
  values: Record<string, number>,
): number | null {
  const spec = definition.aggregations[0];
  if (!spec) {
    return null;
  }

  const keys = formatMetricValueKey(spec.operation, spec.field);
  if (spec.operation === "AVG" && spec.field) {
    const avgKey = avgKeyForField(spec.field);
    const avg = values[avgKey];
    if (typeof avg === "number" && Number.isFinite(avg)) {
      return avg;
    }
  }

  const primaryKey = keys[0];
  if (!primaryKey) {
    return null;
  }

  const value = values[primaryKey];
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}
