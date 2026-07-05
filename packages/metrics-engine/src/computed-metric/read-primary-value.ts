import {
  avgKeyForField,
  valueKeyForAggregation,
} from "../metric-field-keys.js";
import type { MetricDefinitionRecord } from "../types.js";

export function readPrimaryNumericValueFromRow(
  definition: MetricDefinitionRecord,
  values: Record<string, number> | undefined,
): number | null {
  if (!values) {
    return null;
  }

  const spec = definition.aggregations[0];
  if (!spec) {
    return values.primary ?? null;
  }

  if (spec.operation === "AVG" && spec.field) {
    const avg = values[avgKeyForField(spec.field)];
    if (typeof avg === "number" && Number.isFinite(avg)) {
      return avg;
    }
  }

  const keys = valueKeyForAggregation(spec.operation, spec.field);
  if (spec.operation === "AVG" && spec.field) {
    const avg = values[avgKeyForField(spec.field)];
    if (typeof avg === "number" && Number.isFinite(avg)) {
      return avg;
    }
  }

  const primaryKey = keys[0];
  const value = values[primaryKey] ?? values.primary;
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

export function computePercentChange(
  current: number,
  baseline: number | null,
): number | null {
  if (baseline === null || baseline === 0) {
    return null;
  }
  return (current - baseline) / Math.abs(baseline);
}
