import { ALL_KNOWN_PERMISSIONS } from "./known-permissions.js";
import { isPlatformSuperAdmin } from "./platform-role.js";
import { expandGrants, hasPermission } from "./role-matcher.js";
import { BUILT_IN_ROLES, isBuiltInRoleName } from "./roles.js";
import type { ResolvePermissionsInput, UserAccessProfile } from "./types.js";

export { isPlatformSuperAdmin } from "./platform-role.js";

export function resolvePermissions(
  input: ResolvePermissionsInput,
  knownPermissions: readonly string[] = ALL_KNOWN_PERMISSIONS,
): readonly string[] {
  if (isPlatformSuperAdmin(input.platformRole)) {
    return [...knownPermissions];
  }

  const tenantId = input.tenantId.trim();
  if (tenantId.length === 0) {
    return [];
  }

  const tenantRoles = input.tenants?.[tenantId] ?? [];
  if (tenantRoles.length === 0) {
    return [];
  }

  const roleGrants: string[] = [];
  for (const roleName of tenantRoles) {
    if (!isBuiltInRoleName(roleName)) {
      continue;
    }
    roleGrants.push(...BUILT_IN_ROLES[roleName].grants);
  }

  return expandGrants(roleGrants, knownPermissions);
}

export function resolveAccessDecision(
  input: ResolvePermissionsInput,
  requiredPermission: string,
  knownPermissions: readonly string[] = ALL_KNOWN_PERMISSIONS,
): {
  readonly allowed: boolean;
  readonly permissions: readonly string[];
  readonly isSuperAdmin: boolean;
} {
  const isSuperAdmin = isPlatformSuperAdmin(input.platformRole);
  const permissions = resolvePermissions(input, knownPermissions);

  return {
    allowed: hasPermission(requiredPermission, permissions, { isSuperAdmin }),
    permissions,
    isSuperAdmin,
  };
}

export function toUserAccessProfile(
  user: UserAccessProfile,
): UserAccessProfile {
  return {
    platformRole: user.platformRole ?? null,
    tenants: user.tenants,
  };
}
