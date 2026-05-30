import {
  ENTITY_DEFINITION_PERMISSIONS,
  getDynamicPermissionsForTenant,
} from "@repo/dynamic-entities";
import { HOOK_PERMISSIONS } from "@repo/hooks";
import { getAllEntities } from "@repo/entities";

import {
  ROLE_PERMISSIONS,
  TENANT_USER_PERMISSIONS,
} from "./tenant-role-types.js";

export function getAllKnownPermissions(tenantId?: string): readonly string[] {
  const staticPermissions = getAllEntities().flatMap(
    (entity) => entity.metadata.permissions,
  );
  const permissions = [
    ...staticPermissions,
    ...ENTITY_DEFINITION_PERMISSIONS,
    ...HOOK_PERMISSIONS,
    ...ROLE_PERMISSIONS,
    ...TENANT_USER_PERMISSIONS,
    ...(tenantId ? getDynamicPermissionsForTenant(tenantId) : []),
  ];
  return [...new Set(permissions)];
}

/** @deprecated Prefer getAllKnownPermissions() after platform bootstrap. */
export const ALL_KNOWN_PERMISSIONS = getAllKnownPermissions();

export type KnownPermission = string;
