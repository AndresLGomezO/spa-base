export interface RbacRoleDefinition {
  readonly weight: number;
  readonly permissions: readonly string[];
  /** When true, role receives every permission in the merged registry. */
  readonly isSuperAdmin?: boolean;
}

export interface RbacSliceInput<
  TPermissions extends readonly string[],
  TRoles extends Record<string, RbacRoleDefinition>,
> {
  readonly id: string;
  readonly permissions: TPermissions;
  readonly roles: TRoles;
  readonly roleLabels?: Partial<Record<keyof TRoles & string, string>>;
}

export interface RbacSlice<
  TPermissions extends readonly string[] = readonly string[],
  TRoles extends Record<string, RbacRoleDefinition> = Record<
    string,
    RbacRoleDefinition
  >,
> {
  readonly id: string;
  readonly permissions: TPermissions;
  readonly roles: TRoles;
  readonly roleLabels: Record<string, string>;
}

export interface RbacRegistry {
  readonly permissions: readonly string[];
  readonly roles: Readonly<Record<string, RbacRoleDefinition>>;
  readonly roleLabels: Readonly<Record<string, string>>;
  readonly superAdminRoles: ReadonlySet<string>;
  readonly selfProfileOnlyRoles: ReadonlySet<string>;
  hasPermission(role: string, permission: string): boolean;
  isKnownRole(role: string): boolean;
  getRoleWeight(role: string): number;
  canManageRole(actorRole: string, targetRole: string): boolean;
  canAssignRole(actorRole: string, targetRole: string): boolean;
  isRoleDowngrade(oldRole: string, newRole: string): boolean;
}
