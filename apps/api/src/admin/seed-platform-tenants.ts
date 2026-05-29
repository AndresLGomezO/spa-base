import { createFirestoreAdminTenantRepository } from "@repo/gcp-firebase";
import type { FirebaseAdminConfig } from "@repo/gcp-firebase";

const DEV_TENANTS = [
  { id: "tenant_dev_1", name: "Dev Tenant 1" },
  { id: "tenant_dev_2", name: "Dev Tenant 2" },
] as const;

export async function seedPlatformTenants(
  firebaseAdminConfig: FirebaseAdminConfig,
): Promise<void> {
  const repository = createFirestoreAdminTenantRepository(firebaseAdminConfig);

  for (const tenant of DEV_TENANTS) {
    await repository.ensureTenant(tenant.id, tenant.name, null);
  }
}
