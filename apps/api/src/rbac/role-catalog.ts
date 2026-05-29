import { buildTenantRoleCatalog, type RoleCatalog } from "@repo/rbac";
import type {
  PlatformRoleRepository,
  TenantRoleRepository,
} from "@repo/firestore-converters";

const CACHE_TTL_MS = 60_000;

interface CacheEntry {
  readonly catalog: RoleCatalog;
  readonly expiresAt: number;
}

export function createTenantRoleCatalogLoader(
  platformRoleRepository: PlatformRoleRepository,
  tenantRoleRepository: TenantRoleRepository,
) {
  const cache = new Map<string, CacheEntry>();

  return {
    invalidate(tenantId?: string): void {
      if (tenantId) {
        cache.delete(tenantId);
        return;
      }
      cache.clear();
    },
    async loadRoleCatalogForTenant(tenantId: string): Promise<RoleCatalog> {
      const parsedTenantId = tenantId.trim();
      if (parsedTenantId.length === 0) {
        return {};
      }

      const now = Date.now();
      const cached = cache.get(parsedTenantId);
      if (cached && now < cached.expiresAt) {
        return cached.catalog;
      }

      const [globalTemplates, tenantRoles] = await Promise.all([
        platformRoleRepository.listGlobal(),
        tenantRoleRepository.list(parsedTenantId),
      ]);

      const catalog = buildTenantRoleCatalog(tenantRoles, globalTemplates);
      cache.set(parsedTenantId, {
        catalog,
        expiresAt: now + CACHE_TTL_MS,
      });

      return catalog;
    },
  };
}

export type TenantRoleCatalogLoader = ReturnType<
  typeof createTenantRoleCatalogLoader
>;
