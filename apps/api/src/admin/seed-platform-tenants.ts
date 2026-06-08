import { createFirestoreAdminTenantRepository } from "@repo/gcp-firebase";
import type { FirebaseAdminConfig } from "@repo/gcp-firebase";

import type { EntityRuntimeContext } from "../entities/entity-runtime-context.js";
import {
  RATES_TENANT_ID,
  RATES_TENANT_NAME,
} from "./rates-tenant/constants.js";
import { seedRatesTenantMock } from "./rates-tenant/seed-rates-tenant.js";
import { seedTenantRolesFromTemplates } from "./seed-tenant-roles-from-templates.js";

export async function seedPlatformTenants(
  firebaseAdminConfig: FirebaseAdminConfig,
  entityRuntime: EntityRuntimeContext,
): Promise<void> {
  const repository = createFirestoreAdminTenantRepository(firebaseAdminConfig);

  await repository.ensureTenant(RATES_TENANT_ID, RATES_TENANT_NAME, null);
  await seedTenantRolesFromTemplates(firebaseAdminConfig, RATES_TENANT_ID);
  await seedRatesTenantMock(firebaseAdminConfig, entityRuntime);
}
