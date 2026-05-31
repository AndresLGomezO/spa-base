import { useMemo } from "react";

import { usePermission } from "../auth/usePermission";
import type { EntityName } from "../entities/entity-catalog";

interface EntityPermissions {
  readonly canRead: boolean;
  readonly canCreate: boolean;
  readonly canUpdate: boolean;
  readonly canDelete: boolean;
  readonly canReadAll: boolean;
  readonly canWriteAll: boolean;
  readonly canDeleteAll: boolean;
  readonly canManageShares: boolean;
}

export function useEntityPermissions(
  entityName: EntityName,
): EntityPermissions {
  const canRead = usePermission(`${entityName}.read`);
  const canCreate = usePermission(`${entityName}.create`);
  const canUpdate = usePermission(`${entityName}.update`);
  const canDelete = usePermission(`${entityName}.delete`);
  const canReadAll = usePermission(`${entityName}.read_all`);
  const canWriteAll = usePermission(`${entityName}.write_all`);
  const canDeleteAll = usePermission(`${entityName}.delete_all`);
  const canManageShares = usePermission(`${entityName}.manage_shares`);

  return useMemo(
    () => ({
      canRead,
      canCreate,
      canUpdate,
      canDelete,
      canReadAll,
      canWriteAll,
      canDeleteAll,
      canManageShares,
    }),
    [
      canCreate,
      canDelete,
      canRead,
      canUpdate,
      canReadAll,
      canWriteAll,
      canDeleteAll,
      canManageShares,
    ],
  );
}
