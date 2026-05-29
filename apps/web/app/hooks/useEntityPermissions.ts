import { useMemo } from "react";

import { usePermission } from "../auth/usePermission";
import type { EntityName } from "../entities/entity-catalog";

interface EntityPermissions {
  readonly canRead: boolean;
  readonly canCreate: boolean;
  readonly canUpdate: boolean;
  readonly canDelete: boolean;
}

export function useEntityPermissions(
  entityName: EntityName,
): EntityPermissions {
  const canRead = usePermission(`${entityName}.read`);
  const canCreate = usePermission(`${entityName}.create`);
  const canUpdate = usePermission(`${entityName}.update`);
  const canDelete = usePermission(`${entityName}.delete`);

  return useMemo(
    () => ({
      canRead,
      canCreate,
      canUpdate,
      canDelete,
    }),
    [canCreate, canDelete, canRead, canUpdate],
  );
}
