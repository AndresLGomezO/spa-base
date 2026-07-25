import type { AiSpendLimits, PlatformRole } from "@repo/shared-types";

import { BUILT_IN_ROLES, isBuiltInRoleName } from "./roles.js";
import type {
  EntityFieldRules,
  TenantRoleRecord,
} from "./tenant-role-types.js";

function mergeRoleGrants(
  roleName: string,
  grants: readonly string[],
): readonly string[] {
  if (!isBuiltInRoleName(roleName)) {
    return [...grants];
  }

  return [...new Set([...BUILT_IN_ROLES[roleName].grants, ...grants])];
}

export interface RoleCatalogEntry {
  readonly grants: readonly string[];
  readonly fieldRules?: readonly EntityFieldRules[];
  readonly aiSpendLimits?: AiSpendLimits;
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
    catalog[role.name] = { grants: mergeRoleGrants(role.name, role.grants) };
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
    catalog[template.name] = {
      grants: mergeRoleGrants(template.name, template.grants),
    };
  }

  for (const [name, definition] of Object.entries(BUILT_IN_ROLES)) {
    if (!catalog[name]) {
      catalog[name] = { grants: [...definition.grants] };
    }
  }

  for (const role of tenantRoles) {
    catalog[role.name] = {
      grants: mergeRoleGrants(role.name, role.grants),
      ...(role.fieldRules ? { fieldRules: [...role.fieldRules] } : {}),
      ...(role.aiSpendLimits ? { aiSpendLimits: role.aiSpendLimits } : {}),
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
