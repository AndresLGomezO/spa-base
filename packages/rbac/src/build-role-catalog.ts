import type { PlatformRole } from "@repo/shared-types";

import { BUILT_IN_ROLES } from "./roles.js";
import type { RoleDefinition } from "./types.js";

export type RoleCatalog = Readonly<
  Record<string, Pick<RoleDefinition, "grants">>
>;

export function buildRoleCatalog(
  firestoreRoles: readonly PlatformRole[],
): RoleCatalog {
  const catalog: Record<string, Pick<RoleDefinition, "grants">> = {};

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
