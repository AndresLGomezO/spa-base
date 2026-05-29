import { toUserAccessProfile, type UserAccessProfile } from "@repo/rbac";
import type { RegisteredUserRepository } from "@repo/firestore-converters";
import { createTtlCache } from "@repo/shared-types";

interface UserAccessCache {
  getUserAccessProfile(uid: string): Promise<UserAccessProfile | null>;
  invalidate(uid?: string): void;
}

export function createUserAccessCache(
  repository: RegisteredUserRepository,
  options?: { readonly ttlMs?: number },
): UserAccessCache {
  const cache = createTtlCache<string, UserAccessProfile | null>({
    ttlMs: options?.ttlMs ?? 60_000,
  });

  return {
    async getUserAccessProfile(uid) {
      const parsedUid = uid.trim();
      if (parsedUid.length === 0) {
        return null;
      }

      if (cache.has(parsedUid)) {
        return cache.get(parsedUid) ?? null;
      }

      const user = await repository.getByUid(parsedUid);
      const profile = user ? toUserAccessProfile(user) : null;
      cache.set(parsedUid, profile);
      return profile;
    },
    invalidate(uid) {
      if (uid) {
        cache.delete(uid.trim());
        return;
      }
      cache.clear();
    },
  };
}
