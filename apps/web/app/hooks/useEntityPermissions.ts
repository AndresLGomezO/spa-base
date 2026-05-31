import { useMemo } from "react";

import { usePermission } from "../auth/usePermission";
import type { EntityName } from "../entities/entity-catalog";

interface EntityPermissions {
  readonly canRead: boolean;
  readonly canCreate: boolean;
  readonly canUpdate: boolean;
  readonly canDelete: boolean;
  readonly canManageShares: boolean;
}

export function useEntityPermissions(
  entityName: EntityName,
): EntityPermissions {
  const canRead = usePermission(`${entityName}.read`);
  const canCreate = usePermission(`${entityName}.create`);
  const canUpdate = usePermission(`${entityName}.update`);
  const canDelete = usePermission(`${entityName}.delete`);
  const canManageShares = usePermission(`${entityName}.manage_shares`);

  return useMemo(
    () => ({
      canRead,
      canCreate,
      canUpdate,
      canDelete,
      canManageShares,
    }),
    [canCreate, canDelete, canRead, canUpdate, canManageShares],
  );
}
