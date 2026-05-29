import type { FastifyRequest } from "fastify";

import {
  isPlatformSuperAdmin,
  resolvePermissions,
  getAllKnownPermissions,
  toUserAccessProfile,
  type RoleCatalog,
  type UserAccessProfile,
} from "@repo/rbac";
import type { RegisteredUserRepository } from "@repo/firestore-converters";

import type { RequestContext } from "../auth/request-context.js";

export interface LoadRequestPermissionsDeps {
  readonly getUserAccessProfile: (
    uid: string,
  ) => Promise<UserAccessProfile | null>;
  readonly getRoleCatalog: () => Promise<RoleCatalog>;
  readonly getKnownPermissions?: (tenantId: string) => readonly string[];
}

export function createLoadRequestPermissionsDeps(
  registeredUserRepository: RegisteredUserRepository,
  getRoleCatalog: () => Promise<RoleCatalog>,
): LoadRequestPermissionsDeps {
  return {
    getUserAccessProfile: async (uid) => {
      const user = await registeredUserRepository.getByUid(uid);
      if (!user) {
        return null;
      }
      return toUserAccessProfile(user);
    },
    getRoleCatalog,
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

  const [profile, roleCatalog] = await Promise.all([
    deps.getUserAccessProfile(currentCtx.uid),
    deps.getRoleCatalog(),
  ]);

  const accessProfile: UserAccessProfile = profile ?? {
    platformRole: null,
    tenants: {},
  };
  const isSuperAdmin = isPlatformSuperAdmin(accessProfile.platformRole);
  const permissions = resolvePermissions(
    {
      ...accessProfile,
      tenantId: currentCtx.tenantId,
    },
    {
      roleCatalog,
      knownPermissions:
        deps.getKnownPermissions?.(currentCtx.tenantId) ??
        getAllKnownPermissions(currentCtx.tenantId),
    },
  );

  const nextCtx: RequestContext = {
    ...currentCtx,
    permissions,
    isSuperAdmin,
  };
  request.ctx = nextCtx;
  return nextCtx;
}
