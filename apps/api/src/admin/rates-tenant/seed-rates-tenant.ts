import {
  createFirestoreAdminTenantRepository,
  createFirestoreAdminTenantRoleRepository,
  type FirebaseAdminConfig,
} from "@repo/gcp-firebase";

import type { EntityRuntimeContext } from "../../entities/entity-runtime-context.js";
import { seedTenantRolesFromTemplates } from "../seed-tenant-roles-from-templates.js";
import { activateAndBackfillRatesMetrics } from "./backfill-rates-metrics.js";
import {
  RATES_TENANT_ID,
  RATES_TENANT_NAME,
  RATES_TEST_USER_EMAIL,
} from "./constants.js";
import { seedRatesBusinessRecords } from "./records/index.js";
import { buildRatesCustomRoles } from "./roles.js";
import { seedRatesCatalogs } from "./seed-rates-catalogs.js";
import { seedRatesGcpDemoUserAccess } from "./seed-gcp-demo-user-access.js";
import { seedLocalTenantImportIfPresent } from "./seed-local-tenant-import.js";
import { seedRatesEntityUiOverrides } from "./seed-rates-entity-ui-overrides.js";
import { seedRatesUiBuilderPresets } from "./seed-rates-ui-builder-presets.js";
import { seedRatesTenantDashboardLayout } from "./seed-rates-tenant-dashboard-layout.js";
import { ensureRatesRole } from "./seed-helpers.js";
import { seedRatesTestUser } from "./seed-rates-test-user.js";

type RatesDemoOwnerStrategy = "localTestUser" | "gcpUid";

interface SeedRatesTenantOptions {
  readonly tenantId?: string;
  readonly tenantName?: string;
  readonly ensureTenant?: boolean;
  readonly demoOwnerStrategy?: RatesDemoOwnerStrategy;
  readonly backfillMetrics?: boolean;
}

interface SeedRatesTenantResult {
  readonly tenantId: string;
  readonly tenantCreated: boolean;
  readonly definitionsCreated: number;
  readonly definitionsUpdated: number;
  readonly definitionsDeleted: number;
  readonly metricsCreated: number;
  readonly metricsUpdated: number;
  readonly metricsDeleted: number;
  readonly queriesCreated: number;
  readonly queriesUpdated: number;
  readonly queriesDeleted: number;
  readonly demoOwnerId: string | null;
  readonly metricsBackfillFailures: number;
}

async function seedRatesTenant(
  firebaseAdminConfig: FirebaseAdminConfig,
  entityRuntime: EntityRuntimeContext,
  options: SeedRatesTenantOptions = {},
): Promise<SeedRatesTenantResult> {
  const tenantId = options.tenantId ?? RATES_TENANT_ID;
  const tenantName = options.tenantName ?? RATES_TENANT_NAME;
  const ensureTenant = options.ensureTenant ?? false;
  const demoOwnerStrategy = options.demoOwnerStrategy ?? "localTestUser";
  const backfillMetrics = options.backfillMetrics ?? true;

  const tenantRepository =
    createFirestoreAdminTenantRepository(firebaseAdminConfig);
  const roleRepository =
    createFirestoreAdminTenantRoleRepository(firebaseAdminConfig);

  let tenantCreated = false;
  if (ensureTenant) {
    const existingTenant = await tenantRepository.getById(tenantId);
    if (!existingTenant) {
      await tenantRepository.create({
        name: tenantName,
        createdBy: null,
      });
      tenantCreated = true;
    }
  }

  await seedTenantRolesFromTemplates(firebaseAdminConfig, tenantId);

  const catalogResult = await seedRatesCatalogs(
    tenantId,
    firebaseAdminConfig,
    entityRuntime,
  );

  if (demoOwnerStrategy === "localTestUser") {
    for (const role of buildRatesCustomRoles()) {
      await ensureRatesRole(roleRepository, tenantId, role);
    }
  }

  let demoOwnerId: string | null = null;
  if (demoOwnerStrategy === "localTestUser") {
    demoOwnerId = await seedRatesTestUser(firebaseAdminConfig);
  } else {
    demoOwnerId = await seedRatesGcpDemoUserAccess(
      tenantId,
      firebaseAdminConfig,
    );
  }

  if (demoOwnerId && demoOwnerStrategy === "localTestUser") {
    console.log(
      `[seed] Seeding fictional demo business records for ${RATES_TEST_USER_EMAIL}...`,
    );
    await seedRatesBusinessRecords(
      tenantId,
      firebaseAdminConfig,
      catalogResult.definitionRecords,
      demoOwnerId,
    );
  }

  if (demoOwnerStrategy === "localTestUser") {
    await seedLocalTenantImportIfPresent(
      tenantId,
      firebaseAdminConfig,
      catalogResult.definitionRecords,
    );
  }

  await seedRatesEntityUiOverrides(
    tenantId,
    firebaseAdminConfig,
    catalogResult.definitionRecords,
  );

  await seedRatesUiBuilderPresets(tenantId, firebaseAdminConfig);

  await seedRatesTenantDashboardLayout(tenantId, firebaseAdminConfig);

  let metricsBackfillFailures = 0;
  if (backfillMetrics) {
    const backfillResult = await activateAndBackfillRatesMetrics(
      tenantId,
      firebaseAdminConfig,
      entityRuntime,
    );
    metricsBackfillFailures = backfillResult.failures.length;
  }

  return {
    tenantId,
    tenantCreated,
    definitionsCreated: catalogResult.entityCounts.created,
    definitionsUpdated: catalogResult.entityCounts.updated,
    definitionsDeleted: catalogResult.entityCounts.deleted,
    metricsCreated: catalogResult.metricCounts.created,
    metricsUpdated: catalogResult.metricCounts.updated,
    metricsDeleted: catalogResult.metricCounts.deleted,
    queriesCreated: catalogResult.queryCounts.created,
    queriesUpdated: catalogResult.queryCounts.updated,
    queriesDeleted: catalogResult.queryCounts.deleted,
    demoOwnerId,
    metricsBackfillFailures,
  };
}

export async function seedRatesTenantMock(
  firebaseAdminConfig: FirebaseAdminConfig,
  entityRuntime: EntityRuntimeContext,
): Promise<SeedRatesTenantResult> {
  return seedRatesTenant(firebaseAdminConfig, entityRuntime, {
    tenantId: RATES_TENANT_ID,
    tenantName: RATES_TENANT_NAME,
    demoOwnerStrategy: "localTestUser",
    backfillMetrics: true,
  });
}
