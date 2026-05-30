import {
  isPlatformSuperAdmin,
  resolvePermissions,
  toUserAccessProfile,
  type RoleCatalog,
} from "@repo/rbac";
import type { RegisteredUserRepository } from "@repo/firestore-converters";
import {
  createFirestoreAdminTenantRepository,
  type FirebaseAdminConfig,
} from "@repo/gcp-firebase";
import type {
  RegisteredUser,
  TenantAppearance,
  TenantOption,
} from "@repo/shared-types";

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
  readonly tenantRoleNames: readonly string[];
  readonly availableTenants: readonly string[];
  readonly tenantOptions: readonly TenantOption[];
  readonly activeTenantName: string | null;
  readonly tenantAppearance: TenantAppearance | null;
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

  const tenantRoleNames =
    tenantId !== null ? (user.tenants?.[tenantId] ?? []) : [];

  let activeTenantName: string | null = null;
  let tenantAppearance: TenantAppearance | null = null;

  if (tenantId) {
    const tenantRepository = createFirestoreAdminTenantRepository(
      params.firebaseAdminConfig,
    );
    const tenant = await tenantRepository.getById(tenantId);
    activeTenantName = tenant?.name ?? null;
    tenantAppearance = tenant?.appearance ?? null;
  }

  return {
    user,
    permissions,
    isSuperAdmin,
    tenantId,
    tenantRoleNames,
    availableTenants: tenantAccess.availableTenants,
    tenantOptions: tenantAccess.tenantOptions,
    activeTenantName,
    tenantAppearance,
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
