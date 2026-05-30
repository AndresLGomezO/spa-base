import type { FastifyRequest } from "fastify";

import {
  isPlatformSuperAdmin,
  type RoleCatalog,
  type UserAccessProfile,
} from "@repo/rbac";
import type { RegisteredUserRepository } from "@repo/firestore-converters";

import type { RequestContext } from "../auth/request-context.js";
import { measureRbacTiming } from "../observability/request-timing.js";
import type { LoadRequestPermissionsDeps } from "./permission-deps.js";
import {
  getTenantKnownPermissions,
  resolveTenantPermissions,
} from "./resolve-tenant-permissions.js";
import { createUserAccessCache } from "./user-access-cache.js";

export type { LoadRequestPermissionsDeps } from "./permission-deps.js";

export function createLoadRequestPermissionsDeps(
  registeredUserRepository: RegisteredUserRepository,
  getRoleCatalog: (tenantId: string) => Promise<RoleCatalog>,
  options?: { readonly cacheTtlMs?: number },
): LoadRequestPermissionsDeps {
  const userAccessCache = createUserAccessCache(registeredUserRepository, {
    ttlMs: options?.cacheTtlMs,
  });

  return {
    getUserAccessProfile: (uid) => userAccessCache.getUserAccessProfile(uid),
    getRoleCatalog,
    invalidateUserAccessCache: (uid) => userAccessCache.invalidate(uid),
  };
}

export async function loadRequestPermissions(
  request: FastifyRequest,
  deps: LoadRequestPermissionsDeps,
): Promise<RequestContext> {
  const currentCtx = request.ctx;
  if (!currentCtx) {
    throw new Error("Request context must be set before loading permissions.");
  }

  if (currentCtx.permissions !== undefined) {
    return currentCtx;
  }

  const tenantId = currentCtx.tenantId.trim();
  const [profile, roleCatalog] = await measureRbacTiming(request, async () =>
    Promise.all([
      deps.getUserAccessProfile(currentCtx.uid),
      deps.getRoleCatalog(tenantId),
    ]),
  );

  const accessProfile: UserAccessProfile = profile ?? {
    platformRole: null,
    tenants: {},
  };
  const isSuperAdmin = isPlatformSuperAdmin(accessProfile.platformRole);
  const permissions = await resolveTenantPermissions(
    {
      ...accessProfile,
      tenantId,
    },
    deps,
    { roleCatalog },
  );

  const knownPermissions = await getTenantKnownPermissions(deps, tenantId);

  const nextCtx: RequestContext = {
    ...currentCtx,
    permissions,
    isSuperAdmin,
    roleCatalog,
    platformRole: accessProfile.platformRole ?? null,
    tenantRoleNames: accessProfile.tenants?.[tenantId] ?? [],
    knownPermissions,
  };
  request.ctx = nextCtx;
  return nextCtx;
}
