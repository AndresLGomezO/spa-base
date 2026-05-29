import { mergeRbacSlices } from "@repo/rbac-core";
import {
  PLATFORM_ROLE,
  PLATFORM_ROLES,
  baseRbacSlice,
  type PlatformPermission,
  type PlatformRole,
} from "@repo/rbac-base";
import {
  EXAMPLE_ROLE,
  exampleRbacSlice,
  type ExamplePermission,
  type ExampleRole,
} from "@repo/rbac-example";

/**
 * Product RBAC registry. Add module slices here when extending the platform.
 * Set INCLUDE_EXAMPLE_RBAC_SLICE=false in production apps to omit the demo slice.
 */
const INCLUDE_EXAMPLE_SLICE =
  process.env.INCLUDE_EXAMPLE_RBAC_SLICE !== "false";

export const APP_RBAC = mergeRbacSlices(
  baseRbacSlice,
  ...(INCLUDE_EXAMPLE_SLICE ? [exampleRbacSlice] : []),
);

export const ROLE = PLATFORM_ROLE;
export const ROLES = [
  ...PLATFORM_ROLES,
  ...(INCLUDE_EXAMPLE_SLICE ? [EXAMPLE_ROLE.DEMO_VIEWER] : []),
] as const;

export type Permission = PlatformPermission | ExamplePermission;
export type AppRole = PlatformRole | ExampleRole;

export type UserRole = AppRole;

export const ROLE_LABELS: Readonly<Record<string, string>> =
  APP_RBAC.roleLabels;

export function isUserRole(role: string): role is AppRole {
  return APP_RBAC.isKnownRole(role);
}

export function hasPermission(
  userRole: string,
  requiredPermission: Permission,
): boolean {
  return APP_RBAC.hasPermission(userRole, requiredPermission);
}

export const ROLES_SELF_PROFILE_ONLY: ReadonlySet<AppRole> =
  APP_RBAC.selfProfileOnlyRoles as ReadonlySet<AppRole>;

export function parseAppRole(role: string): AppRole | null {
  return isUserRole(role) ? role : null;
}

export const DEFAULT_APP_ROLE: AppRole = ROLE.MEMBER;

export const PERMISSIONS = APP_RBAC.permissions as readonly Permission[];

export const canManageRole = APP_RBAC.canManageRole;
export const canAssignRole = APP_RBAC.canAssignRole;
export const isRoleDowngrade = APP_RBAC.isRoleDowngrade;
export const getRoleWeight = APP_RBAC.getRoleWeight;
