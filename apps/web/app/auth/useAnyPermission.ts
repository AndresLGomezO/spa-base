import { hasPermission, isTenantBuiltInAdminRole } from "@repo/rbac";

import { useAuth } from "./AuthContext";

export function useAnyPermission(required: readonly string[]): boolean {
  const { isSuperAdmin, permissions, tenantRoleNames } = useAuth();

  if (isTenantBuiltInAdminRole(tenantRoleNames)) {
    return true;
  }

  return required.some((permission) =>
    hasPermission(permission, permissions, { isSuperAdmin }),
  );
}
