import { buildRoleCatalog, type RoleCatalog } from "@repo/rbac";
import type { PlatformRoleRepository } from "@repo/firestore-converters";

let cachedRoleCatalog: RoleCatalog | null = null;
let cacheExpiresAt = 0;
const CACHE_TTL_MS = 60_000;

export function createRoleCatalogLoader(
  platformRoleRepository: PlatformRoleRepository,
) {
  return async function loadRoleCatalog(): Promise<RoleCatalog> {
    const now = Date.now();
    if (cachedRoleCatalog && now < cacheExpiresAt) {
      return cachedRoleCatalog;
    }

    const roles = await platformRoleRepository.listGlobal();
    cachedRoleCatalog = buildRoleCatalog(roles);
    cacheExpiresAt = now + CACHE_TTL_MS;
    return cachedRoleCatalog;
  };
}
