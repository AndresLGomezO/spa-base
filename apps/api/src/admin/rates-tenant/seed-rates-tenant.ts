import {
  createFirestoreAdminEntityCategoryRepository,
  createFirestoreAdminEntityDefinitionRepository,
  createFirestoreAdminEntityUiOverrideRepository,
  createFirestoreAdminMetricDefinitionRepository,
  createFirestoreAdminTenantRepository,
  createFirestoreAdminTenantRoleRepository,
  type FirebaseAdminConfig,
} from "@repo/gcp-firebase";

import type { EntityRuntimeContext } from "../../entities/entity-runtime-context.js";
import { seedTenantRolesFromTemplates } from "../seed-tenant-roles-from-templates.js";
import { activateAndBackfillRatesMetrics } from "./backfill-rates-metrics.js";
import { RATES_ENTITY_CATEGORIES } from "./categories.js";
import {
  RATES_CATEGORY_NAMES,
  RATES_TENANT_ID,
  RATES_TENANT_NAME,
} from "./constants.js";
import {
  buildRatesEntityDefinitions,
  type RatesNavCategoryIds,
} from "./definitions/index.js";
import { buildRatesMetricDefinitions } from "./metrics/index.js";
import { seedRatesBusinessRecords } from "./records/index.js";
import { buildRatesCustomRoles } from "./roles.js";
import { seedRatesContractUiOverride } from "./seed-contract-ui-override.js";
import { seedRatesGcpDemoUserAccess } from "./seed-gcp-demo-user-access.js";
import {
  ensureRatesRole,
  seedRatesCategories,
  seedRatesDefinitions,
} from "./seed-helpers.js";
import { seedRatesMetrics } from "./seed-metric-helpers.js";
import { seedRatesTestUser } from "./seed-rates-test-user.js";

type RatesDemoOwnerStrategy = "localTestUser" | "gcpUid";

interface SeedRatesTenantOptions {
  readonly tenantId?: string;
  readonly tenantName?: string;
  readonly ensureTenant?: boolean;
  readonly demoOwnerStrategy?: RatesDemoOwnerStrategy;
  readonly seedContractUiOverride?: boolean;
  readonly backfillMetrics?: boolean;
}

interface SeedRatesTenantResult {
  readonly tenantId: string;
  readonly tenantCreated: boolean;
  readonly definitionsCreated: number;
  readonly definitionsUpdated: number;
  readonly definitionsSkipped: number;
  readonly metricsCreated: number;
  readonly metricsUpdated: number;
  readonly metricsSkipped: number;
  readonly demoOwnerId: string | null;
  readonly contractUiOverrideSeeded: boolean;
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
  const seedContractUiOverride = options.seedContractUiOverride ?? true;
  const backfillMetrics = options.backfillMetrics ?? true;

  const tenantRepository =
    createFirestoreAdminTenantRepository(firebaseAdminConfig);
  const categoryRepository =
    createFirestoreAdminEntityCategoryRepository(firebaseAdminConfig);
  const definitionRepository =
    createFirestoreAdminEntityDefinitionRepository(firebaseAdminConfig);
  const metricDefinitionRepository =
    createFirestoreAdminMetricDefinitionRepository(firebaseAdminConfig);
  const roleRepository =
    createFirestoreAdminTenantRoleRepository(firebaseAdminConfig);
  const uiOverrideRepository =
    createFirestoreAdminEntityUiOverrideRepository(firebaseAdminConfig);

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

  const categoryIdsByName = await seedRatesCategories(
    categoryRepository,
    tenantId,
    RATES_ENTITY_CATEGORIES,
  );

  const navCategoryIds: RatesNavCategoryIds = {
    contracts: categoryIdsByName[RATES_CATEGORY_NAMES.contracts]!,
  };

  const definitions = buildRatesEntityDefinitions(navCategoryIds);
  const definitionResult = await seedRatesDefinitions(
    tenantId,
    definitionRepository,
    entityRuntime,
    definitions,
  );

  const metricResult = await seedRatesMetrics(
    tenantId,
    metricDefinitionRepository,
    buildRatesMetricDefinitions(),
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

  if (demoOwnerId) {
    await seedRatesBusinessRecords(
      tenantId,
      firebaseAdminConfig,
      definitionResult.records,
      demoOwnerId,
    );
  }

  let contractUiOverrideSeeded = false;
  if (seedContractUiOverride) {
    contractUiOverrideSeeded = await seedRatesContractUiOverride(
      tenantId,
      entityRuntime,
      uiOverrideRepository,
    );
  }

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
    definitionsCreated: definitionResult.created,
    definitionsUpdated: definitionResult.updated,
    definitionsSkipped: definitionResult.skipped,
    metricsCreated: metricResult.created,
    metricsUpdated: metricResult.updated,
    metricsSkipped: metricResult.skipped,
    demoOwnerId,
    contractUiOverrideSeeded,
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
    seedContractUiOverride: true,
    backfillMetrics: true,
  });
}
