export {
  ALL_KNOWN_PERMISSIONS,
  getAllKnownPermissions,
  type KnownPermission,
} from "./known-permissions.js";
export { isPlatformSuperAdmin } from "./platform-role.js";
export { expandGrant, expandGrants, hasPermission } from "./role-matcher.js";
export { BUILT_IN_ROLES, isBuiltInRoleName } from "./roles.js";
export {
  buildRoleCatalog,
  getRoleGrants,
  type RoleCatalog,
} from "./build-role-catalog.js";
export {
  resolveAccessDecision,
  resolvePermissions,
  toUserAccessProfile,
  type ResolvePermissionsOptions,
} from "./resolve-permissions.js";
export {
  BUILT_IN_ROLE_NAMES,
  PLATFORM_SUPERADMIN,
  type BuiltInRoleName,
  type ResolvePermissionsInput,
  type RoleDefinition,
  type UserAccessProfile,
} from "./types.js";
