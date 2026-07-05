/**
 * Browser-safe entry point for @repo/metrics-engine.
 * Web and other client bundles must import from this module (or its subpaths),
 * never from the package root — the root re-exports Node-only helpers such as
 * buildMetricDocId (node:crypto).
 */
export {
  normalizeMetricDateValue,
  isMetricDateBucketInputComplete,
  applyDateGranularityToQuerySlice,
  shiftMetricDateBucket,
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
  METRIC_COMPUTATION_MODES,
  METRIC_DATE_GRANULARITIES,
  METRIC_VALUE_DISPLAY_FORMATS,
} from "./types.js";
export type {
  MetricDateGranularity,
  MetricValueDisplayFormat,
  MetricDefinitionRecord,
  MetricAggregationOperation,
  CreateMetricDefinitionInput,
  MetricDefinitionParameter,
  ComputedMetricComputation,
  ComputedMetricInputRef,
  MetricComputationMode,
} from "./types.js";
export {
  METRIC_DEFINITION_JSON_KIND,
  METRIC_DEFINITION_JSON_VERSION,
  METRIC_DEFINITIONS_CATALOG_JSON_KIND,
  computeCatalogReplacePlan,
  createMetricDefinitionEnvelope,
  createMetricDefinitionsCatalogEnvelope,
  listBackfillRelevantChangedFields,
  metricDefinitionNeedsBackfill,
  parseMetricDefinitionJson,
  parseMetricDefinitionsCatalogJson,
  toPortableMetricDefinition,
  validateMetricDefinitionImport,
  validateMetricDefinitionsCatalogImport,
  validateMetricDefinitionsCatalogEnvelope,
} from "./metric-definition-json.js";
export type {
  CatalogReplacePlan,
  MetricDefinitionFormData,
  MetricDefinitionJsonError,
  MetricDefinitionsCatalogEnvelope,
  PortableMetricDefinition,
} from "./metric-definition-json.js";
