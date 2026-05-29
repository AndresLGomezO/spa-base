import {
  ENTITY_DEFINITION_PERMISSIONS,
  getDynamicPermissionsForTenant,
} from "@repo/dynamic-entities";
import { getAllEntities } from "@repo/entities";

const FALLBACK_PERMISSIONS = [
  "organization.read",
  "organization.create",
  "organization.update",
  "organization.delete",
  "project.read",
  "project.create",
  "project.update",
  "project.delete",
] as const;

export function getAllKnownPermissions(tenantId?: string): readonly string[] {
  const staticPermissions = getAllEntities().flatMap(
    (entity) => entity.metadata.permissions,
  );
  const permissions = [
    ...(staticPermissions.length > 0
      ? staticPermissions
      : [...FALLBACK_PERMISSIONS]),
    ...ENTITY_DEFINITION_PERMISSIONS,
    ...(tenantId ? getDynamicPermissionsForTenant(tenantId) : []),
  ];
  return [...new Set(permissions)];
}

/** @deprecated Prefer getAllKnownPermissions() after platform bootstrap. */
export const ALL_KNOWN_PERMISSIONS = getAllKnownPermissions();

export type KnownPermission = string;
