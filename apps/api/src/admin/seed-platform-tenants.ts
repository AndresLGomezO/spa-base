import { createFirestoreAdminTenantRepository } from "@repo/gcp-firebase";
import type { FirebaseAdminConfig } from "@repo/gcp-firebase";

import type { EntityRuntimeContext } from "../entities/entity-runtime-context.js";
import {
  RATES_TENANT_ID,
  RATES_TENANT_NAME,
} from "./rates-tenant/constants.js";
import {
  seedRatesTenantGcp,
  seedRatesTenantMock,
} from "./rates-tenant/seed-rates-tenant.js";
import { seedTenantRolesFromTemplates } from "./seed-tenant-roles-from-templates.js";

interface SeedPlatformTenantsOptions {
  readonly gcp?: boolean;
}

export async function seedPlatformTenants(
  firebaseAdminConfig: FirebaseAdminConfig,
  entityRuntime: EntityRuntimeContext,
  options: SeedPlatformTenantsOptions = {},
): Promise<void> {
  const repository = createFirestoreAdminTenantRepository(firebaseAdminConfig);

  await repository.ensureTenant(RATES_TENANT_ID, RATES_TENANT_NAME, null);
  await seedTenantRolesFromTemplates(firebaseAdminConfig, RATES_TENANT_ID);

  if (options.gcp) {
    await seedRatesTenantGcp(firebaseAdminConfig, entityRuntime);
    return;
  }

  await seedRatesTenantMock(firebaseAdminConfig, entityRuntime);
}
