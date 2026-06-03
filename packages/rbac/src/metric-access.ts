import { hasPermission } from "./role-matcher.js";

export function canReadMetricValues(
  sourceModel: string,
  permissions: readonly string[],
  options?: { readonly isSuperAdmin?: boolean },
): boolean {
  const model = sourceModel.trim();
  if (model.length === 0) {
    return false;
  }

  return (
    hasPermission("metricValue.read", permissions, options) ||
    hasPermission(`${model}.read`, permissions, options)
  );
}

export function canReadMetricDefinition(
  sourceModel: string,
  permissions: readonly string[],
  options?: { readonly isSuperAdmin?: boolean },
): boolean {
  const model = sourceModel.trim();
  if (model.length === 0) {
    return false;
  }

  return (
    hasPermission("metricDefinition.read", permissions, options) ||
    canReadMetricValues(model, permissions, options)
  );
}
