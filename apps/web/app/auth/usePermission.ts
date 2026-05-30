import { hasPermission } from "@repo/rbac";

import { useAuth } from "./AuthContext";

export function usePermission(required: string): boolean {
  const { isSuperAdmin, permissions } = useAuth();

  return hasPermission(required, permissions, { isSuperAdmin });
}
