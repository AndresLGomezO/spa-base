import type { ReactNode } from "react";

import { type EntityName } from "../../entities/entity-catalog";
import { PermissionGuard } from "../../routing/RouteGuards";

interface RequireEntityPermissionProps {
  readonly entityName: EntityName;
  readonly action?: "read" | "create" | "update";
  readonly children: ReactNode;
}

export function RequireEntityPermission({
  entityName,
  action = "read",
  children,
}: RequireEntityPermissionProps) {
  return (
    <PermissionGuard permission={`${entityName}.${action}`}>
      {children}
    </PermissionGuard>
  );
}
