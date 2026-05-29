import { isPlatformSuperAdmin } from "./platform-role.js";

export function expandGrant(
  grant: string,
  knownPermissions: readonly string[],
): readonly string[] {
  const trimmed = grant.trim();
  if (trimmed.length === 0) {
    return [];
  }

  if (trimmed === "*") {
    return knownPermissions;
  }

  if (trimmed.endsWith(".*")) {
    const prefix = trimmed.slice(0, -2);
    return knownPermissions.filter((permission) =>
      permission.startsWith(`${prefix}.`),
    );
  }

  if (trimmed.startsWith("*.")) {
    const suffix = trimmed.slice(1);
    return knownPermissions.filter((permission) => permission.endsWith(suffix));
  }

  return [trimmed];
}

export function expandGrants(
  grants: readonly string[],
  knownPermissions: readonly string[],
): readonly string[] {
  const expanded = new Set<string>();
  for (const grant of grants) {
    for (const permission of expandGrant(grant, knownPermissions)) {
      expanded.add(permission);
    }
  }
  return [...expanded];
}

export function hasPermission(
  required: string,
  resolved: readonly string[],
  options?: {
    readonly isSuperAdmin?: boolean;
    readonly platformRole?: string | null;
  },
): boolean {
  if (options?.isSuperAdmin || isPlatformSuperAdmin(options?.platformRole)) {
    return true;
  }

  if (resolved.includes(required)) {
    return true;
  }

  if (required === "*") {
    return resolved.length > 0;
  }

  if (required.endsWith(".*")) {
    const prefix = required.slice(0, -2);
    return resolved.some((permission) => permission.startsWith(`${prefix}.`));
  }

  if (required.startsWith("*.")) {
    const suffix = required.slice(1);
    return resolved.some((permission) => permission.endsWith(suffix));
  }

  return false;
}
