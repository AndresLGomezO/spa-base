import type { TenantAppearance } from "@repo/shared-types";

const ACTIVE_TENANT_ID_KEY = "active-tenant-id";

function appearanceCacheKey(tenantId: string): string {
  return `tenant-appearance:${tenantId}`;
}

function readCachedTenantAppearance(tenantId: string): TenantAppearance | null {
  try {
    const raw = sessionStorage.getItem(appearanceCacheKey(tenantId));
    if (!raw) {
      return null;
    }
    return JSON.parse(raw) as TenantAppearance;
  } catch {
    return null;
  }
}

function readCachedActiveTenantId(): string | null {
  try {
    return sessionStorage.getItem(ACTIVE_TENANT_ID_KEY);
  } catch {
    return null;
  }
}

export function writeCachedTenantAppearance(
  tenantId: string,
  appearance: TenantAppearance | null,
): void {
  try {
    sessionStorage.setItem(ACTIVE_TENANT_ID_KEY, tenantId);
    if (!appearance) {
      sessionStorage.removeItem(appearanceCacheKey(tenantId));
      return;
    }
    sessionStorage.setItem(
      appearanceCacheKey(tenantId),
      JSON.stringify(appearance),
    );
  } catch {
    /* ignore quota / private mode */
  }
}

export function clearCachedTenantAppearance(): void {
  try {
    const tenantId = sessionStorage.getItem(ACTIVE_TENANT_ID_KEY);
    sessionStorage.removeItem(ACTIVE_TENANT_ID_KEY);
    if (tenantId) {
      sessionStorage.removeItem(appearanceCacheKey(tenantId));
    }
  } catch {
    /* ignore */
  }
}

export function readBootstrapTenantAppearance(): TenantAppearance | null {
  const tenantId = readCachedActiveTenantId();
  if (!tenantId) {
    return null;
  }
  return readCachedTenantAppearance(tenantId);
}
