import type { HookEntityAccessControl } from "@repo/hooks";

import type { RoleCatalog } from "./build-role-catalog.js";
import {
  assertWritableFields,
  filterFields,
  resolveFieldAccessMap,
} from "./field-permissions.js";
import { hasPermission } from "./role-matcher.js";
import type { FieldAccess } from "./tenant-role-types.js";

export function createHookEntityAccessControl(options: {
  readonly permissions: readonly string[];
  readonly isSuperAdmin: boolean;
  readonly tenantId: string;
  readonly roleCatalog?: RoleCatalog;
  readonly knownPermissions?: readonly string[];
  readonly platformRole?: string | null;
  readonly tenantRoleNames?: readonly string[];
}): HookEntityAccessControl {
  function resolveFieldAccess(
    entityName: string,
    entityFieldNames: readonly string[],
    action: "read" | "create" | "update",
  ): Record<string, FieldAccess> {
    if (options.isSuperAdmin) {
      const map: Record<string, FieldAccess> = {};
      for (const field of entityFieldNames) {
        map[field] = "write";
      }
      return map;
    }

    return resolveFieldAccessMap(
      {
        platformRole: options.platformRole ?? null,
        tenants:
          options.tenantRoleNames && options.tenantRoleNames.length > 0
            ? { [options.tenantId]: options.tenantRoleNames }
            : {},
        tenantId: options.tenantId,
      },
      entityName,
      entityFieldNames,
      {
        roleCatalog: options.roleCatalog ?? {},
        ...(options.knownPermissions
          ? { knownPermissions: options.knownPermissions }
          : {}),
        action,
      },
    );
  }

  return {
    hasPermission(permission) {
      return hasPermission(permission, options.permissions, {
        isSuperAdmin: options.isSuperAdmin,
      });
    },
    resolveFieldAccess,
    assertWritableFields,
    filterFields,
  };
}
