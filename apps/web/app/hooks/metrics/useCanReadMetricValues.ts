import { canReadMetricValues } from "@repo/rbac";

import { useAuth } from "../../auth/AuthContext.js";

type MetricReadAccess = "pending" | "allowed" | "denied";

export function useMetricReadAccess(
  sourceModel: string | undefined,
  options?: { readonly sourceModelResolved?: boolean },
): MetricReadAccess {
  const { isSuperAdmin, permissions, isSessionResolved } = useAuth();

  if (!isSessionResolved) {
    return "pending";
  }

  if (options?.sourceModelResolved === false) {
    return "pending";
  }

  if (!sourceModel?.trim()) {
    return options?.sourceModelResolved ? "denied" : "pending";
  }

  return canReadMetricValues(sourceModel, permissions, { isSuperAdmin })
    ? "allowed"
    : "denied";
}

export function useCanReadMetricValues(
  sourceModel: string | undefined,
): boolean {
  return (
    useMetricReadAccess(sourceModel, {
      sourceModelResolved: Boolean(sourceModel?.trim()),
    }) === "allowed"
  );
}
