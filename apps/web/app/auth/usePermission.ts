import { useMemo } from "react";
import { hasPermission, type Permission } from "@repo/rbac-app";

import { useAuth } from "./AuthContext";

export function usePermission(permission: Permission): boolean {
  const { user } = useAuth();
  const role = user?.role;

  return useMemo(
    () => (role ? hasPermission(role, permission) : false),
    [role, permission],
  );
}
