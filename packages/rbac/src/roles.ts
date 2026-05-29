import type { BuiltInRoleName, RoleDefinition } from "./types.js";

export const BUILT_IN_ROLES: Readonly<Record<BuiltInRoleName, RoleDefinition>> =
  {
    admin: {
      name: "admin",
      grants: ["*"],
    },
    editor: {
      name: "editor",
      grants: ["*.read", "*.create", "*.update"],
    },
    viewer: {
      name: "viewer",
      grants: ["*.read"],
    },
  };

export function isBuiltInRoleName(value: string): value is BuiltInRoleName {
  return value in BUILT_IN_ROLES;
}
