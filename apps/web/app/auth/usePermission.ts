import { useAuth } from "./AuthContext";

export function usePermission(required: string): boolean {
  const { isSuperAdmin, permissions } = useAuth();

  if (isSuperAdmin) {
    return true;
  }

  return permissions.includes(required);
}
