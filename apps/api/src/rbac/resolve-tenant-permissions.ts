import {
  getAllKnownPermissions,
  resolvePermissions,
  type ResolvePermissionsInput,
  type RoleCatalog,
} from "@repo/rbac";

import type {
  ResolveTenantPermissionsDeps,
  TenantKnownPermissionsDeps,
} from "./permission-deps.js";

export async function resolveTenantPermissions(
  input: ResolvePermissionsInput,
  deps: ResolveTenantPermissionsDeps,
  options?: {
    readonly roleCatalog?: RoleCatalog;
  },
): Promise<readonly string[]> {
  const tenantId = input.tenantId.trim();
  if (tenantId.length === 0) {
    return [];
  }

  const roleCatalog =
    options?.roleCatalog ?? (await deps.getRoleCatalog(tenantId));

  const knownPermissions = deps.prepareKnownPermissions
    ? await deps.prepareKnownPermissions(tenantId)
    : (deps.getKnownPermissions?.(tenantId) ??
      getAllKnownPermissions(tenantId));

  return resolvePermissions(input, { roleCatalog, knownPermissions });
}

export async function getTenantKnownPermissions(
  deps: TenantKnownPermissionsDeps,
  tenantId: string,
): Promise<readonly string[]> {
  const parsedTenantId = tenantId.trim();
  if (parsedTenantId.length === 0) {
    return [];
  }

  if (deps.prepareKnownPermissions) {
    return deps.prepareKnownPermissions(parsedTenantId);
  }

  return (
    deps.getKnownPermissions?.(parsedTenantId) ??
    getAllKnownPermissions(parsedTenantId)
  );
}
