/**
 * Browser-safe entry point for @repo/metrics-engine.
 * Web and other client bundles must import from this module (or its subpaths),
 * never from the package root — the root re-exports Node-only helpers such as
 * buildMetricDocId (node:crypto).
 */
export {
  normalizeMetricDateValue,
  applyDateGranularityToQuerySlice,
} from "./date-granularity.js";
export {
  validateMetricQueryAgainstDefinition,
  metricRowQuerySchema,
  metricBatchQuerySchema,
  MetricQueryValidationError,
} from "./validate-metric-query.js";
export type {
  MetricRowQuery,
  MetricBatchQuery,
} from "./validate-metric-query.js";
export {
  normalizeMetricFieldKey,
  sumKeyForField,
  countKeyForField,
  avgKeyForField,
  valueKeyForAggregation,
} from "./metric-field-keys.js";
export {
  METRIC_DATE_GRANULARITIES,
  METRIC_VALUE_DISPLAY_FORMATS,
} from "./types.js";
export type {
  MetricDateGranularity,
  MetricValueDisplayFormat,
  MetricDefinitionRecord,
  MetricAggregationOperation,
} from "./types.js";
