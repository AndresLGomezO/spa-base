import { canReadMetricValues } from "@repo/rbac";

import { useAuth } from "../../auth/AuthContext.js";

export function useCanReadMetricValues(
  sourceModel: string | undefined,
): boolean {
  const { isSuperAdmin, permissions } = useAuth();
  if (!sourceModel?.trim()) {
    return false;
  }

  return canReadMetricValues(sourceModel, permissions, { isSuperAdmin });
}
