import {
  isPlatformSuperAdmin,
  resolvePermissions,
  toUserAccessProfile,
  type RoleCatalog,
} from "@repo/rbac";
import type { RegisteredUserRepository } from "@repo/firestore-converters";
import type { FirebaseAdminConfig } from "@repo/gcp-firebase";
import type { RegisteredUser, TenantOption } from "@repo/shared-types";

import {
  parseBootstrapSuperAdminEmails,
  shouldBootstrapSuperAdmin,
  withBootstrapPlatformRole,
} from "../admin/bootstrap-platform-role.js";
import { listAvailableTenants } from "../admin/list-available-tenants.js";
import { apiEnv } from "../config/env.js";

interface AuthSessionContext {
  readonly user: RegisteredUser;
  readonly permissions: readonly string[];
  readonly isSuperAdmin: boolean;
  readonly tenantId: string | null;
  readonly availableTenants: readonly string[];
  readonly tenantOptions: readonly TenantOption[];
}

export async function buildAuthSessionContext(params: {
  readonly registeredUser: RegisteredUser;
  readonly created: boolean;
  readonly jwtTenantId: string;
  readonly roleCatalog: RoleCatalog;
  readonly firebaseAdminConfig: FirebaseAdminConfig;
  readonly registeredUserRepository: RegisteredUserRepository;
}): Promise<AuthSessionContext> {
  const bootstrapEmails = parseBootstrapSuperAdminEmails(
    apiEnv.PLATFORM_BOOTSTRAP_SUPERADMIN_EMAILS,
  );

  let user = params.registeredUser;
  if (
    shouldBootstrapSuperAdmin({
      email: user.email,
      created: params.created,
      platformRole: user.platformRole,
      allowlist: bootstrapEmails,
    })
  ) {
    user = withBootstrapPlatformRole(user);
    const persisted = await params.registeredUserRepository.updateAccess(
      user.uid,
      { platformRole: user.platformRole },
    );
    if (persisted) {
      user = persisted;
    }
  }

  const accessProfile = toUserAccessProfile(user);
  const isSuperAdmin = isPlatformSuperAdmin(accessProfile.platformRole);
  const tenantId = params.jwtTenantId.length > 0 ? params.jwtTenantId : null;
  const permissions =
    tenantId !== null
      ? resolvePermissions(
          {
            ...accessProfile,
            tenantId,
          },
          { roleCatalog: params.roleCatalog },
        )
      : [];

  const tenantAccess = await listAvailableTenants({
    config: params.firebaseAdminConfig,
    isSuperAdmin,
    userTenantIds: Object.keys(user.tenants ?? {}),
  });

  return {
    user,
    permissions,
    isSuperAdmin,
    tenantId,
    availableTenants: tenantAccess.availableTenants,
    tenantOptions: tenantAccess.tenantOptions,
  };
}

export function canAccessTenant(params: {
  readonly isSuperAdmin: boolean;
  readonly userTenantIds: readonly string[];
  readonly requestedTenantId: string;
  readonly availableTenantIds: readonly string[];
}): boolean {
  if (!params.availableTenantIds.includes(params.requestedTenantId)) {
    return false;
  }

  if (params.isSuperAdmin) {
    return true;
  }

  return params.userTenantIds.includes(params.requestedTenantId);
}
