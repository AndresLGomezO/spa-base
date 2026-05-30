import type { RoleCatalog, UserAccessProfile } from "@repo/rbac";

export interface LoadRequestPermissionsDeps {
  readonly getUserAccessProfile: (
    uid: string,
  ) => Promise<UserAccessProfile | null>;
  readonly getRoleCatalog: (tenantId: string) => Promise<RoleCatalog>;
  readonly getKnownPermissions?: (tenantId: string) => readonly string[];
  readonly prepareKnownPermissions?: (
    tenantId: string,
  ) => Promise<readonly string[]>;
  readonly invalidateUserAccessCache?: (uid?: string) => void;
}

export type ResolveTenantPermissionsDeps = Pick<
  LoadRequestPermissionsDeps,
  "getRoleCatalog" | "prepareKnownPermissions" | "getKnownPermissions"
>;

export type TenantKnownPermissionsDeps = Pick<
  LoadRequestPermissionsDeps,
  "prepareKnownPermissions" | "getKnownPermissions"
>;
