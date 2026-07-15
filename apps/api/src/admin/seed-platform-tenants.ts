import { createFirestoreAdminTenantRepository } from "@repo/gcp-firebase";
import type { FirebaseAdminConfig } from "@repo/gcp-firebase";

import type { EntityRuntimeContext } from "../entities/entity-runtime-context.js";
import type { SeedSelection } from "../scripts/seed-selection.js";
import { selectionIncludes } from "../scripts/seed-selection.js";
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
  readonly selection?: SeedSelection;
}

export async function seedPlatformTenants(
  firebaseAdminConfig: FirebaseAdminConfig,
  entityRuntime: EntityRuntimeContext,
  options: SeedPlatformTenantsOptions = {},
): Promise<void> {
  const repository = createFirestoreAdminTenantRepository(firebaseAdminConfig);
  const selection = options.selection ?? { components: null, ids: null };

  await repository.ensureTenant(RATES_TENANT_ID, RATES_TENANT_NAME, null);

  if (selectionIncludes(selection, "platform")) {
    await seedTenantRolesFromTemplates(firebaseAdminConfig, RATES_TENANT_ID);
  }

  if (options.gcp) {
    await seedRatesTenantGcp(firebaseAdminConfig, entityRuntime, selection);
    return;
  }

  await seedRatesTenantMock(firebaseAdminConfig, entityRuntime, selection);
}
