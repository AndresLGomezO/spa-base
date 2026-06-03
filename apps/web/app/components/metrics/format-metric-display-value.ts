import { avgKeyForField } from "@repo/metrics-engine/browser";
import { formatDisplayValue } from "@repo/ui";

import type { MetricDefinitionRecord } from "../../lib/api-client.js";
import { formatMetricValueKey } from "../../lib/metric-query-utils.js";

function formatPrimaryMetricValue(
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

export function formatPrimaryMetricDisplayValue(
  definition: MetricDefinitionRecord,
  values: Record<string, number>,
  locale?: string,
): string | null {
  const numeric = formatPrimaryMetricValue(definition, values);
  if (numeric === null) {
    return null;
  }

  return formatDisplayValue(numeric, {
    fieldType: "number",
    displayFormat:
      definition.valueDisplayFormat === "currency" ? "currency" : "plain",
    locale,
  });
}
