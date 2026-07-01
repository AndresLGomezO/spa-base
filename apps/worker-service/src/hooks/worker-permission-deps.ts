import type { RegisteredUserRepository } from "@repo/firestore-converters";
import type { RoleCatalog } from "@repo/rbac";

import { createUserAccessCache } from "./worker-user-access-cache.js";

export function createLoadRequestPermissionsDeps(
  registeredUserRepository: RegisteredUserRepository,
  getRoleCatalog: (tenantId: string) => Promise<RoleCatalog>,
  options?: { readonly cacheTtlMs?: number },
) {
  const userAccessCache = createUserAccessCache(registeredUserRepository, {
    ttlMs: options?.cacheTtlMs,
  });

  return {
    getUserAccessProfile: (uid: string) =>
      userAccessCache.getUserAccessProfile(uid),
    getRoleCatalog,
    invalidateUserAccessCache: (uid: string) => userAccessCache.invalidate(uid),
  };
}

export type WorkerPermissionDeps = ReturnType<
  typeof createLoadRequestPermissionsDeps
>;
