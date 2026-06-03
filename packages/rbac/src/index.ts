export {
  canIncludeEntityInCatalog,
  INTERNAL_ENTITY_PERMISSIONS,
  INTERNAL_ENTITY_READ_PERMISSION,
} from "@repo/dynamic-entities";
export {
  ALL_KNOWN_PERMISSIONS,
  getAllKnownPermissions,
  type KnownPermission,
} from "./known-permissions.js";
export { isPlatformSuperAdmin } from "./platform-role.js";
export { expandGrant, expandGrants, hasPermission } from "./role-matcher.js";
export {
  canReadMetricDefinition,
  canReadMetricValues,
} from "./metric-access.js";
export {
  BUILT_IN_ROLES,
  isBuiltInRoleName,
  isTenantBuiltInAdminRole,
} from "./roles.js";
export {
  buildRoleCatalog,
  buildTenantRoleCatalog,
  getRoleGrants,
  type RoleCatalog,
  type RoleCatalogEntry,
} from "./build-role-catalog.js";
export {
  assertWritableFields,
  FieldAccessError,
  filterFields,
  mergeFieldAccessMaps,
  resolveFieldAccessMap,
  type ResolveFieldAccessOptions,
} from "./field-permissions.js";
export {
  createTenantRoleInputSchema,
  patchTenantRoleInputSchema,
  tenantRoleRecordSchema,
  TENANT_ROLES_SUBCOLLECTION,
  ROLE_PERMISSIONS,
  TENANT_USER_PERMISSIONS,
  fieldAccessSchema,
  fieldPermissionSchema,
  entityFieldRulesSchema,
  SYSTEM_FIELD_KEYS,
  isSystemFieldKey,
} from "./tenant-role-types.js";
export type {
  CreateTenantRoleInput,
  EntityFieldRules,
  FieldAccess,
  FieldPermission,
  PatchTenantRoleInput,
  SystemFieldKey,
  TenantRoleRecord,
} from "./tenant-role-types.js";
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
