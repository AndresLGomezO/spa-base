import type { MetricAggregationSpec } from "./types.js";

export function isDocumentCountAggregation(
  spec: Pick<MetricAggregationSpec, "operation"> & { readonly field?: string },
): boolean {
  return spec.operation === "COUNT" && !spec.field;
}

export function isDocumentCountMetric(metric: {
  readonly aggregations: readonly (Pick<MetricAggregationSpec, "operation"> & {
    readonly field?: string;
  })[];
}): boolean {
  return (
    metric.aggregations.length > 0 &&
    metric.aggregations.every((spec) => isDocumentCountAggregation(spec))
  );
}

export function validateFieldsDependency(
  aggregations: readonly (Pick<MetricAggregationSpec, "operation"> & {
    readonly field?: string;
  })[],
  fieldsDependency: readonly string[],
): boolean {
  if (isDocumentCountMetric({ aggregations })) {
    return true;
  }

  return fieldsDependency.length >= 1;
}
