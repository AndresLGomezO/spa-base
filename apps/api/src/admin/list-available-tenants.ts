import { createFirestoreAdminTenantRepository } from "@repo/gcp-firebase";
import type { FirebaseAdminConfig } from "@repo/gcp-firebase";
import type { TenantOption } from "@repo/shared-types";

interface AvailableTenantsResult {
  readonly availableTenants: readonly string[];
  readonly tenantOptions: readonly TenantOption[];
}

export async function listAvailableTenants(params: {
  readonly config: FirebaseAdminConfig;
  readonly isSuperAdmin: boolean;
  readonly userTenantIds: readonly string[];
}): Promise<AvailableTenantsResult> {
  const repository = createFirestoreAdminTenantRepository(params.config);
  const activeTenants = await repository.list({ status: "active" });
  const activeById = new Map(
    activeTenants.map((tenant) => [tenant.id, tenant]),
  );

  const candidateIds = params.isSuperAdmin
    ? [
        ...new Set([
          ...params.userTenantIds,
          ...activeTenants.map((tenant) => tenant.id),
        ]),
      ]
    : [...params.userTenantIds];

  const availableTenants = candidateIds.filter((tenantId) =>
    activeById.has(tenantId),
  );

  const tenantOptions = availableTenants.map((id) => {
    const tenant = activeById.get(id);
    return {
      id,
      name: tenant?.name ?? id,
    };
  });

  return { availableTenants, tenantOptions };
}

export async function validateActiveTenantIds(params: {
  readonly config: FirebaseAdminConfig;
  readonly tenantIds: readonly string[];
}): Promise<string | null> {
  const repository = createFirestoreAdminTenantRepository(params.config);

  for (const tenantId of params.tenantIds) {
    const parsedId = tenantId.trim();
    if (!parsedId) {
      return "Tenant id must not be empty.";
    }

    const tenant = await repository.getById(parsedId);
    if (!tenant) {
      return `Unknown tenant: ${parsedId}`;
    }

    if (tenant.status !== "active") {
      return `Tenant is not active: ${parsedId}`;
    }
  }

  return null;
}
