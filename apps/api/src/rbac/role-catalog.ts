import { buildTenantRoleCatalog, type RoleCatalog } from "@repo/rbac";
import type {
  PlatformRoleRepository,
  TenantRoleRepository,
} from "@repo/firestore-converters";
import { createTtlCache } from "@repo/shared-types";

export function createTenantRoleCatalogLoader(
  platformRoleRepository: PlatformRoleRepository,
  tenantRoleRepository: TenantRoleRepository,
  options?: { readonly ttlMs?: number },
) {
  const cache = createTtlCache<string, RoleCatalog>({
    ttlMs: options?.ttlMs ?? 60_000,
  });

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

      const cached = cache.get(parsedTenantId);
      if (cached) {
        return cached;
      }

      const [globalTemplates, tenantRoles] = await Promise.all([
        platformRoleRepository.listGlobal(),
        tenantRoleRepository.list(parsedTenantId),
      ]);

      const catalog = buildTenantRoleCatalog(tenantRoles, globalTemplates);
      cache.set(parsedTenantId, catalog);
      return catalog;
    },
  };
}

export type TenantRoleCatalogLoader = ReturnType<
  typeof createTenantRoleCatalogLoader
>;
