import { getRoleGrants, type RoleCatalog } from "./build-role-catalog.js";
import { isPlatformSuperAdmin } from "./platform-role.js";
import { hasPermission } from "./role-matcher.js";
import {
  resolvePermissions,
  type ResolvePermissionsOptions,
} from "./resolve-permissions.js";
import type { EntityFieldRules, FieldAccess } from "./tenant-role-types.js";
import { isSystemFieldKey } from "./tenant-role-types.js";
import type { ResolvePermissionsInput } from "./types.js";

const FIELD_ACCESS_RANK: Record<FieldAccess, number> = {
  none: 0,
  read: 1,
  write: 2,
};

export interface ResolveFieldAccessOptions extends ResolvePermissionsOptions {
  readonly action?: "read" | "create" | "update";
}

function maxFieldAccess(left: FieldAccess, right: FieldAccess): FieldAccess {
  return FIELD_ACCESS_RANK[left] >= FIELD_ACCESS_RANK[right] ? left : right;
}

function getEntityDefaultAccess(
  entityName: string,
  permissions: readonly string[],
  action: "read" | "create" | "update",
  isSuperAdmin: boolean,
): FieldAccess {
  if (isSuperAdmin) {
    return "write";
  }

  if (action === "read") {
    return hasPermission(`${entityName}.read`, permissions) ? "write" : "none";
  }

  const writePermission =
    action === "create" ? `${entityName}.create` : `${entityName}.update`;
  if (hasPermission(writePermission, permissions)) {
    return "write";
  }

  if (hasPermission(`${entityName}.read`, permissions)) {
    return "read";
  }

  return "none";
}

function collectFieldRulesForRoles(
  roleNames: readonly string[],
  roleCatalog: RoleCatalog,
  entityName: string,
): readonly EntityFieldRules[] {
  const rules: EntityFieldRules[] = [];

  for (const roleName of roleNames) {
    const grants = getRoleGrants(roleName, roleCatalog);
    if (!grants) {
      continue;
    }

    const roleDefinition = roleCatalog[roleName];
    const fieldRules = roleDefinition?.fieldRules ?? [];
    for (const rule of fieldRules) {
      if (rule.resource === entityName) {
        rules.push(rule);
      }
    }
  }

  return rules;
}

export function mergeFieldAccessMaps(
  maps: ReadonlyArray<Readonly<Record<string, FieldAccess>>>,
): Record<string, FieldAccess> {
  const merged: Record<string, FieldAccess> = {};

  for (const map of maps) {
    for (const [field, access] of Object.entries(map)) {
      if (isSystemFieldKey(field)) {
        continue;
      }
      merged[field] = merged[field]
        ? maxFieldAccess(merged[field], access)
        : access;
    }
  }

  return merged;
}

export function resolveFieldAccessMap(
  input: ResolvePermissionsInput,
  entityName: string,
  entityFieldNames: readonly string[],
  options?: ResolveFieldAccessOptions,
): Record<string, FieldAccess> {
  const action = options?.action ?? "read";
  const isSuperAdmin = isPlatformSuperAdmin(input.platformRole);
  const permissions = resolvePermissions(input, options);
  const defaultAccess = getEntityDefaultAccess(
    entityName,
    permissions,
    action,
    isSuperAdmin,
  );

  if (isSuperAdmin) {
    const map: Record<string, FieldAccess> = {};
    for (const field of entityFieldNames) {
      map[field] = "write";
    }
    return map;
  }

  if (defaultAccess === "none") {
    const map: Record<string, FieldAccess> = {};
    for (const field of entityFieldNames) {
      map[field] = "none";
    }
    return map;
  }

  const tenantId = input.tenantId.trim();
  const roleNames = input.tenants?.[tenantId] ?? [];
  const roleCatalog = options?.roleCatalog ?? {};
  const fieldRules = collectFieldRulesForRoles(
    roleNames,
    roleCatalog,
    entityName,
  );

  const explicitAccess: Record<string, FieldAccess> = {};
  for (const rule of fieldRules) {
    for (const fieldPermission of rule.fields) {
      if (isSystemFieldKey(fieldPermission.field)) {
        continue;
      }
      explicitAccess[fieldPermission.field] = explicitAccess[
        fieldPermission.field
      ]
        ? maxFieldAccess(
            explicitAccess[fieldPermission.field],
            fieldPermission.access,
          )
        : fieldPermission.access;
    }
  }

  const map: Record<string, FieldAccess> = {};
  for (const field of entityFieldNames) {
    map[field] = explicitAccess[field] ?? defaultAccess;
  }

  return map;
}

export function filterFields<T extends Record<string, unknown>>(
  record: T,
  fieldAccessMap: Readonly<Record<string, FieldAccess>>,
  entityFieldNames: readonly string[],
): T {
  const filtered = { ...record } as Record<string, unknown>;

  for (const field of entityFieldNames) {
    const access = fieldAccessMap[field] ?? "none";
    if (access === "none") {
      delete filtered[field];
    }
  }

  return filtered as T;
}

export class FieldAccessError extends Error {
  readonly fieldErrors: Readonly<Record<string, string>>;

  constructor(fieldErrors: Record<string, string>) {
    super("One or more fields are not writable.");
    this.name = "FieldAccessError";
    this.fieldErrors = fieldErrors;
  }
}

export function assertWritableFields(
  data: Readonly<Record<string, unknown>>,
  fieldAccessMap: Readonly<Record<string, FieldAccess>>,
  entityFieldNames: readonly string[],
): void {
  const fieldErrors: Record<string, string> = {};

  for (const field of entityFieldNames) {
    if (!(field in data)) {
      continue;
    }

    const access = fieldAccessMap[field] ?? "none";
    if (access !== "write") {
      fieldErrors[field] =
        access === "read" ? "Field is read-only." : "Field is not accessible.";
    }
  }

  if (Object.keys(fieldErrors).length > 0) {
    throw new FieldAccessError(fieldErrors);
  }
}
