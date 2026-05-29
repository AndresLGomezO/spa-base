import type { PlatformRole } from "@repo/shared-types";

import { BUILT_IN_ROLES } from "./roles.js";
import type {
  EntityFieldRules,
  TenantRoleRecord,
} from "./tenant-role-types.js";

export interface RoleCatalogEntry {
  readonly grants: readonly string[];
  readonly fieldRules?: readonly EntityFieldRules[];
}

export type RoleCatalog = Readonly<Record<string, RoleCatalogEntry>>;

export function buildRoleCatalog(
  firestoreRoles: readonly PlatformRole[],
): RoleCatalog {
  const catalog: Record<string, RoleCatalogEntry> = {};

  for (const role of firestoreRoles) {
    if (role.tenantId !== null) {
      continue;
    }
    catalog[role.name] = { grants: [...role.grants] };
  }

  for (const [name, definition] of Object.entries(BUILT_IN_ROLES)) {
    if (!catalog[name]) {
      catalog[name] = { grants: [...definition.grants] };
    }
  }

  return catalog;
}

export function buildTenantRoleCatalog(
  tenantRoles: readonly TenantRoleRecord[],
  globalTemplates: readonly PlatformRole[] = [],
): RoleCatalog {
  const catalog: Record<string, RoleCatalogEntry> = {};

  for (const template of globalTemplates) {
    if (template.tenantId !== null) {
      continue;
    }
    catalog[template.name] = { grants: [...template.grants] };
  }

  for (const [name, definition] of Object.entries(BUILT_IN_ROLES)) {
    if (!catalog[name]) {
      catalog[name] = { grants: [...definition.grants] };
    }
  }

  for (const role of tenantRoles) {
    catalog[role.name] = {
      grants: [...role.grants],
      fieldRules: role.fieldRules ? [...role.fieldRules] : undefined,
    };
  }

  return catalog;
}

export function getRoleGrants(
  roleName: string,
  roleCatalog: RoleCatalog,
): readonly string[] | null {
  const fromCatalog = roleCatalog[roleName];
  if (fromCatalog) {
    return fromCatalog.grants;
  }

  return null;
}
