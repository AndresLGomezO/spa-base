/** Browser-safe permission constants (no Node.js crypto). */

export const METRIC_DEFINITION_PERMISSIONS = [
  "metricDefinition.read",
  "metricDefinition.create",
  "metricDefinition.update",
  "metricDefinition.delete",
  "metricDefinition.backfill",
] as const;

export const METRIC_VALUE_PERMISSIONS = ["metricValue.read"] as const;

export const METRIC_PERMISSIONS = [
  ...METRIC_DEFINITION_PERMISSIONS,
  ...METRIC_VALUE_PERMISSIONS,
] as const;
