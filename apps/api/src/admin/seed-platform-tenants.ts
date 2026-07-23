import { createFirestoreAdminTenantRepository } from "@repo/gcp-firebase";
import type { FirebaseAdminConfig } from "@repo/gcp-firebase";

import type { EntityRuntimeContext } from "../entities/entity-runtime-context.js";
import type { SeedSelection } from "../scripts/seed-selection.js";
import { selectionIncludes } from "../scripts/seed-selection.js";
import {
  localTenantImportPresent,
  loadLocalTenantConfig,
} from "./local-tenant-seed/load-tenant-config.js";
import {
  seedLocalTenantGcp,
  seedLocalTenantMock,
} from "./local-tenant-seed/seed-local-tenant.js";
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
  if (!localTenantImportPresent()) {
    console.log(
      "[seed] Skipping local tenant seed (.local/tenant-import/tenant.json not found).",
    );
    return;
  }

  const config = loadLocalTenantConfig();
  const repository = createFirestoreAdminTenantRepository(firebaseAdminConfig);
  const selection = options.selection ?? {
    components: null,
    ids: null,
    drop: false,
  };

  await repository.ensureTenant(config.id, config.name, null);

  if (selectionIncludes(selection, "platform")) {
    await seedTenantRolesFromTemplates(firebaseAdminConfig, config.id);
  }

  if (options.gcp) {
    await seedLocalTenantGcp(
      firebaseAdminConfig,
      entityRuntime,
      selection,
      config,
    );
    return;
  }

  await seedLocalTenantMock(
    firebaseAdminConfig,
    entityRuntime,
    selection,
    config,
  );
}
