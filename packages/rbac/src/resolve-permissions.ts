import { ALL_KNOWN_PERMISSIONS } from "./known-permissions.js";
import { isPlatformSuperAdmin } from "./platform-role.js";
import { expandGrants, hasPermission } from "./role-matcher.js";
import {
  buildRoleCatalog,
  getRoleGrants,
  type RoleCatalog,
} from "./build-role-catalog.js";
import type { ResolvePermissionsInput, UserAccessProfile } from "./types.js";

export { isPlatformSuperAdmin } from "./platform-role.js";

export interface ResolvePermissionsOptions {
  readonly knownPermissions?: readonly string[];
  readonly roleCatalog?: RoleCatalog;
}

function normalizeOptions(
  options?: ResolvePermissionsOptions | readonly string[],
): ResolvePermissionsOptions {
  if (options === undefined) {
    return {};
  }

  if (Array.isArray(options)) {
    return { knownPermissions: options };
  }

  return options as ResolvePermissionsOptions;
}

export function resolvePermissions(
  input: ResolvePermissionsInput,
  options?: ResolvePermissionsOptions | readonly string[],
): readonly string[] {
  const { knownPermissions = ALL_KNOWN_PERMISSIONS, roleCatalog = {} } =
    normalizeOptions(options);

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

  const catalog =
    Object.keys(roleCatalog).length > 0 ? roleCatalog : buildRoleCatalog([]);

  const roleGrants: string[] = [];
  for (const roleName of tenantRoles) {
    const grants = getRoleGrants(roleName, catalog);
    if (grants) {
      roleGrants.push(...grants);
    }
  }

  return expandGrants(roleGrants, knownPermissions);
}

export function resolveAccessDecision(
  input: ResolvePermissionsInput,
  requiredPermission: string,
  options?: ResolvePermissionsOptions | readonly string[],
): {
  readonly allowed: boolean;
  readonly permissions: readonly string[];
  readonly isSuperAdmin: boolean;
} {
  const isSuperAdmin = isPlatformSuperAdmin(input.platformRole);
  const permissions = resolvePermissions(input, options);

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
