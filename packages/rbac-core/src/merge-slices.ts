import type { RbacRegistry, RbacRoleDefinition, RbacSlice } from "./types.js";

function assertNoDuplicates(
  label: string,
  values: readonly string[],
  sliceId: string,
): void {
  const seen = new Set<string>();
  for (const value of values) {
    if (seen.has(value)) {
      throw new Error(
        `Duplicate ${label} "${value}" within slice "${sliceId}".`,
      );
    }
    seen.add(value);
  }
}

function buildPermissionSets(
  roles: Readonly<Record<string, RbacRoleDefinition>>,
  allPermissions: ReadonlySet<string>,
  superAdminRoles: ReadonlySet<string>,
): ReadonlyMap<string, ReadonlySet<string>> {
  const map = new Map<string, ReadonlySet<string>>();

  for (const [roleId, role] of Object.entries(roles)) {
    if (role.isSuperAdmin || superAdminRoles.has(roleId)) {
      map.set(roleId, allPermissions);
      continue;
    }
    map.set(roleId, new Set(role.permissions));
  }

  return map;
}

function computeSelfProfileOnlyRoles(
  roles: Readonly<Record<string, RbacRoleDefinition>>,
  permissionSets: ReadonlyMap<string, ReadonlySet<string>>,
): ReadonlySet<string> {
  const set = new Set<string>();

  for (const roleId of Object.keys(roles)) {
    const perms = permissionSets.get(roleId);
    if (!perms) continue;

    const hasViewSelf =
      perms.has("user:view_self") || perms.has("platform.user.view_self");
    const hasViewAll =
      perms.has("user:view_all") || perms.has("platform.user.view_all");
    const hasTeamView =
      perms.has("team:view") || perms.has("platform.team.view");

    if (hasViewSelf && !hasViewAll && !hasTeamView) {
      set.add(roleId);
    }
  }

  return set;
}

export function mergeRbacSlices(...slices: readonly RbacSlice[]): RbacRegistry {
  return createRbacContext(...slices);
}

export function createRbacContext(
  ...slices: readonly RbacSlice[]
): RbacRegistry {
  if (slices.length === 0) {
    throw new Error("mergeRbacSlices requires at least one slice.");
  }

  const permissions: string[] = [];
  const roles: Record<string, RbacRoleDefinition> = {};
  const roleLabels: Record<string, string> = {};
  const superAdminRoles = new Set<string>();

  const permissionOwners = new Map<string, string>();
  const roleOwners = new Map<string, string>();

  for (const slice of slices) {
    assertNoDuplicates("permission", slice.permissions, slice.id);

    for (const permission of slice.permissions) {
      const existingOwner = permissionOwners.get(permission);
      if (existingOwner && existingOwner !== slice.id) {
        throw new Error(
          `Permission "${permission}" is defined in both "${existingOwner}" and "${slice.id}" slices.`,
        );
      }
      permissionOwners.set(permission, slice.id);
      permissions.push(permission);
    }

    for (const [roleId, role] of Object.entries(slice.roles)) {
      const existingOwner = roleOwners.get(roleId);
      if (existingOwner && existingOwner !== slice.id) {
        throw new Error(
          `Role "${roleId}" is defined in both "${existingOwner}" and "${slice.id}" slices.`,
        );
      }
      roleOwners.set(roleId, slice.id);
      roles[roleId] = role;
      roleLabels[roleId] = slice.roleLabels[roleId] ?? roleId;

      if (role.isSuperAdmin) {
        superAdminRoles.add(roleId);
      }
    }
  }

  const allPermissions = new Set(permissions);
  const permissionSets = buildPermissionSets(
    roles,
    allPermissions,
    superAdminRoles,
  );
  const selfProfileOnlyRoles = computeSelfProfileOnlyRoles(
    roles,
    permissionSets,
  );

  const registryRoles = roles;

  function hasPermission(role: string, permission: string): boolean {
    const perms = permissionSets.get(role);
    return perms?.has(permission) ?? false;
  }

  function isKnownRole(role: string): boolean {
    return role in registryRoles;
  }

  function getRoleWeight(role: string): number {
    return registryRoles[role]?.weight ?? 0;
  }

  function canManageRole(actorRole: string, targetRole: string): boolean {
    if (!isKnownRole(actorRole) || !isKnownRole(targetRole)) return false;

    const actor = registryRoles[actorRole];
    const target = registryRoles[targetRole];

    if (
      (actor.isSuperAdmin || superAdminRoles.has(actorRole)) &&
      (target.isSuperAdmin || superAdminRoles.has(targetRole))
    ) {
      return true;
    }

    return actor.weight > target.weight;
  }

  function canAssignRole(actorRole: string, targetRole: string): boolean {
    if (!isKnownRole(actorRole) || !isKnownRole(targetRole)) return false;

    const actor = registryRoles[actorRole];
    if (actor.isSuperAdmin || superAdminRoles.has(actorRole)) {
      return true;
    }

    return actor.weight > registryRoles[targetRole].weight;
  }

  function isRoleDowngrade(oldRole: string, newRole: string): boolean {
    if (!isKnownRole(oldRole) || !isKnownRole(newRole)) return false;
    return registryRoles[newRole].weight < registryRoles[oldRole].weight;
  }

  return {
    permissions,
    roles: registryRoles,
    roleLabels,
    superAdminRoles,
    selfProfileOnlyRoles,
    hasPermission,
    isKnownRole,
    getRoleWeight,
    canManageRole,
    canAssignRole,
    isRoleDowngrade,
  };
}
