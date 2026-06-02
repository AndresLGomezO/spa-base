import type { BuiltInRoleName, RoleDefinition } from "./types.js";

export const BUILT_IN_ROLES: Readonly<Record<BuiltInRoleName, RoleDefinition>> =
  {
    admin: {
      name: "admin",
      grants: ["*", "entityUiOverride.read", "entityUiOverride.update"],
    },
    editor: {
      name: "editor",
      grants: [
        "*.read",
        "*.create",
        "*.update",
        "entityUiOverride.read",
        "entityUiOverride.update",
      ],
    },
    viewer: {
      name: "viewer",
      grants: ["*.read"],
    },
  };

export function isBuiltInRoleName(value: string): value is BuiltInRoleName {
  return value in BUILT_IN_ROLES;
}

export function isTenantBuiltInAdminRole(
  tenantRoleNames: readonly string[] | undefined,
): boolean {
  return (tenantRoleNames ?? []).includes("admin");
}
