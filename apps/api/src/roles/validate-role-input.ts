import {
  expandGrants,
  isBuiltInRoleName,
  type EntityFieldRules,
} from "@repo/rbac";

function isValidGrant(
  grant: string,
  knownPermissions: readonly string[],
): boolean {
  const trimmed = grant.trim();
  if (trimmed.length === 0) {
    return false;
  }

  if (trimmed === "*" || trimmed.endsWith(".*") || trimmed.startsWith("*.")) {
    return true;
  }

  return knownPermissions.includes(trimmed);
}

export function validateRoleGrants(
  grants: readonly string[],
  knownPermissions: readonly string[],
): string | null {
  if (grants.length === 0) {
    return "At least one grant is required.";
  }

  for (const grant of grants) {
    if (!isValidGrant(grant, knownPermissions)) {
      return `Unknown grant: ${grant}`;
    }
  }

  const expanded = expandGrants(grants, knownPermissions);
  if (expanded.length === 0) {
    return "Grants must resolve to at least one permission.";
  }

  return null;
}

export function validateRoleFieldRules(
  fieldRules: readonly EntityFieldRules[] | undefined,
  availableEntities: ReadonlyArray<{
    readonly name: string;
    readonly fields: readonly string[];
  }>,
): string | null {
  if (!fieldRules || fieldRules.length === 0) {
    return null;
  }

  const entityMap = new Map(
    availableEntities.map((entity) => [entity.name, new Set(entity.fields)]),
  );

  for (const rule of fieldRules) {
    const fields = entityMap.get(rule.resource);
    if (!fields) {
      return `Unknown entity in field rules: ${rule.resource}`;
    }

    for (const fieldPermission of rule.fields) {
      if (!fields.has(fieldPermission.field)) {
        return `Unknown field "${fieldPermission.field}" on entity "${rule.resource}".`;
      }
    }
  }

  return null;
}

export function assertCustomRoleName(name: string): string | null {
  if (isBuiltInRoleName(name)) {
    return `Role name "${name}" is reserved.`;
  }
  return null;
}

export function assertBuiltInRolePatch(
  roleId: string,
  patch: { readonly grants?: readonly string[] },
): string | null {
  if (!isBuiltInRoleName(roleId)) {
    return null;
  }

  if (patch.grants !== undefined) {
    return `Built-in role "${roleId}" grants cannot be modified.`;
  }

  return null;
}
