export interface RequestContext {
  readonly uid: string;
  readonly tenantId: string;
  readonly claims: Record<string, unknown>;
  readonly permissions?: readonly string[];
  readonly isSuperAdmin?: boolean;
  readonly roleCatalog?: import("@repo/rbac").RoleCatalog;
  readonly platformRole?: string | null;
  readonly tenantRoleNames?: readonly string[];
  readonly knownPermissions?: readonly string[];
}
