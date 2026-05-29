import type { FastifyRequest } from "fastify";

import {
  isPlatformSuperAdmin,
  resolvePermissions,
  getAllKnownPermissions,
  type RoleCatalog,
  type UserAccessProfile,
} from "@repo/rbac";
import type { RegisteredUserRepository } from "@repo/firestore-converters";

import type { RequestContext } from "../auth/request-context.js";
import { measureRbacTiming } from "../observability/request-timing.js";
import { createUserAccessCache } from "./user-access-cache.js";

export interface LoadRequestPermissionsDeps {
  readonly getUserAccessProfile: (
    uid: string,
  ) => Promise<UserAccessProfile | null>;
  readonly getRoleCatalog: (tenantId: string) => Promise<RoleCatalog>;
  readonly getKnownPermissions?: (tenantId: string) => readonly string[];
  readonly invalidateUserAccessCache?: (uid?: string) => void;
}

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
  const permissions = resolvePermissions(
    {
      ...accessProfile,
      tenantId,
    },
    {
      roleCatalog,
      knownPermissions:
        deps.getKnownPermissions?.(tenantId) ??
        getAllKnownPermissions(tenantId),
    },
  );

  const knownPermissions =
    deps.getKnownPermissions?.(tenantId) ?? getAllKnownPermissions(tenantId);

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
