import { isDocumentCountMetric } from "./aggregation-helpers.js";
import type { MetricFilter } from "./types.js";

function normalizeValue(value: unknown): unknown {
  if (value === null || value === undefined) {
    return value;
  }
  return value;
}

export function recordMatchesFilters(
  record: Record<string, unknown>,
  filters: readonly MetricFilter[],
): boolean {
  if (filters.length === 0) {
    return true;
  }

  return filters.every((filter) => {
    const fieldValue = normalizeValue(record[filter.field]);
    if (filter.op === "eq") {
      return fieldValue === filter.value;
    }

    if (!Array.isArray(filter.value)) {
      return false;
    }

    return filter.value.includes(String(fieldValue ?? ""));
  });
}

export function intersectsFields(
  left: readonly string[],
  right: readonly string[],
): boolean {
  if (left.length === 0 || right.length === 0) {
    return false;
  }

  const rightSet = new Set(right);
  return left.some((field) => rightSet.has(field));
}

export function metricMatchesEvent(
  metric: {
    readonly sourceModel: string;
    readonly fieldsDependency: readonly string[];
    readonly status: string;
    readonly aggregations?: readonly {
      readonly operation: "SUM" | "COUNT" | "AVG";
      readonly field?: string;
    }[];
  },
  event: {
    readonly model: string;
    readonly changedFields: readonly string[];
    readonly operation: "CREATE" | "UPDATE" | "DELETE";
  },
): boolean {
  if (metric.status !== "ACTIVE") {
    return false;
  }

  if (metric.sourceModel !== event.model) {
    return false;
  }

  if (
    metric.aggregations &&
    isDocumentCountMetric({ aggregations: metric.aggregations })
  ) {
    return true;
  }

  if (event.operation === "CREATE" || event.operation === "DELETE") {
    return true;
  }

  return intersectsFields(event.changedFields, metric.fieldsDependency);
}
