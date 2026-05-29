import type { ReactNode } from "react";
import { Navigate, Outlet } from "react-router";
import { hasPermission, type Permission } from "@repo/rbac-app";

import { useAuth } from "./AuthContext";

type PermissionGateProps = {
  readonly children?: ReactNode;
} & (
  | {
      readonly requiredPermission: Permission;
      readonly requiredAnyPermission?: never;
    }
  | {
      readonly requiredAnyPermission: readonly Permission[];
      readonly requiredPermission?: never;
    }
);

export function PermissionGate(props: PermissionGateProps) {
  const { children } = props;
  const { user } = useAuth();

  if (!user) {
    return <Navigate to="/forbidden" replace />;
  }

  const permitted =
    "requiredPermission" in props && props.requiredPermission !== undefined
      ? hasPermission(user.role, props.requiredPermission)
      : props.requiredAnyPermission.some((permission) =>
          hasPermission(user.role, permission),
        );

  if (!permitted) {
    return <Navigate to="/forbidden" replace />;
  }

  return children ?? <Outlet />;
}
