export const PLATFORM_SUPERADMIN = "platform.superadmin" as const;

export const BUILT_IN_ROLE_NAMES = ["admin", "editor", "viewer"] as const;

export type BuiltInRoleName = (typeof BUILT_IN_ROLE_NAMES)[number];

export interface RoleDefinition {
  readonly name: BuiltInRoleName;
  readonly grants: readonly string[];
}

export interface UserAccessProfile {
  readonly platformRole?: string | null;
  readonly tenants?: Readonly<Record<string, readonly string[]>>;
}

export interface ResolvePermissionsInput extends UserAccessProfile {
  readonly tenantId: string;
}
