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

export function getAllKnownPermissions(): readonly string[] {
  const permissions = getAllEntities().flatMap(
    (entity) => entity.metadata.permissions,
  );
  if (permissions.length > 0) {
    return [...new Set(permissions)];
  }
  return [...FALLBACK_PERMISSIONS];
}

/** @deprecated Prefer getAllKnownPermissions() after platform bootstrap. */
export const ALL_KNOWN_PERMISSIONS = getAllKnownPermissions();

export type KnownPermission = string;
