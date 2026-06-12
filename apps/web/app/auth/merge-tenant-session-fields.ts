import type { TenantAppearance } from "@repo/shared-types";

import type { TenantOption } from "./auth.types";

interface TenantSessionSyncUser {
  readonly tenantId: string | null;
  readonly availableTenants: readonly string[];
  readonly tenantOptions: readonly TenantOption[];
  readonly permissions: readonly string[];
  readonly isSuperAdmin: boolean;
  readonly tenantRoleNames: readonly string[];
  readonly activeTenantName: string | null;
  readonly tenantAppearance: TenantAppearance | null;
}

interface TenantSessionSelectResult {
  readonly tenantId?: string;
  readonly availableTenants?: readonly string[];
  readonly tenantOptions?: readonly TenantOption[];
  readonly permissions?: readonly string[];
  readonly isSuperAdmin?: boolean;
  readonly tenantRoleNames?: readonly string[];
  readonly activeTenantName?: string | null;
  readonly tenantAppearance?: TenantAppearance | null;
}

interface MergedTenantSessionFields {
  readonly tenantId: string;
  readonly availableTenants: readonly string[];
  readonly tenantOptions: readonly TenantOption[];
  readonly permissions: readonly string[];
  readonly isSuperAdmin: boolean;
  readonly tenantRoleNames: readonly string[];
  readonly activeTenantName: string | null;
  readonly tenantAppearance: TenantAppearance | null;
}

function preferNonEmpty<T>(
  primary: readonly T[],
  fallback: readonly T[] | undefined,
): readonly T[] {
  return primary.length > 0 ? primary : (fallback ?? []);
}

function preferDefined<T>(
  primary: T | null | undefined,
  fallback: T | null | undefined,
): T | null {
  if (primary !== null && primary !== undefined) {
    return primary;
  }
  return fallback ?? null;
}

export function mergeTenantSessionFields(
  selectedTenantId: string,
  selectResult: TenantSessionSelectResult,
  syncUser: TenantSessionSyncUser,
): MergedTenantSessionFields {
  return {
    tenantId: syncUser.tenantId ?? selectedTenantId,
    availableTenants: preferNonEmpty(
      syncUser.availableTenants,
      selectResult.availableTenants,
    ),
    tenantOptions: preferNonEmpty(
      syncUser.tenantOptions,
      selectResult.tenantOptions,
    ),
    permissions: preferNonEmpty(syncUser.permissions, selectResult.permissions),
    isSuperAdmin: syncUser.isSuperAdmin || (selectResult.isSuperAdmin ?? false),
    tenantRoleNames: preferNonEmpty(
      syncUser.tenantRoleNames,
      selectResult.tenantRoleNames,
    ),
    activeTenantName: preferDefined(
      syncUser.activeTenantName,
      selectResult.activeTenantName,
    ),
    tenantAppearance: preferDefined(
      syncUser.tenantAppearance,
      selectResult.tenantAppearance,
    ),
  };
}
