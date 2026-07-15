import {
  createFirestoreAdminTenantRepository,
  createFirestoreAdminTenantRoleRepository,
  type FirebaseAdminConfig,
} from "@repo/gcp-firebase";

import type { EntityRuntimeContext } from "../../entities/entity-runtime-context.js";
import {
  isFullSeed,
  listSelectedGeneratedEntityNames,
  listSelectedLocalEntityNames,
  selectionIncludes,
  selectionIncludesAny,
  SEED_CATALOG_COMPONENTS,
  SEED_GENERATED_ENTITY_COMPONENTS,
  SEED_LOCAL_ENTITY_COMPONENTS,
  type SeedSelection,
} from "../../scripts/seed-selection.js";
import { seedTenantRolesFromTemplates } from "../seed-tenant-roles-from-templates.js";
import { activateAndBackfillRatesMetrics } from "./backfill-rates-metrics.js";
import {
  RATES_GCP_DEMO_OWNER_UID,
  RATES_TENANT_ID,
  RATES_TENANT_NAME,
  RATES_TEST_USER_EMAIL,
} from "./constants.js";
import { seedRatesBusinessRecords } from "./records/index.js";
import { buildRatesCustomRoles } from "./roles.js";
import { seedRatesCatalogs } from "./seed-rates-catalogs.js";
import { seedRatesGcpDemoUserAccess } from "./seed-gcp-demo-user-access.js";
import {
  seedLocalTenantImportIfPresent,
  type LocalTenantImportOptions,
} from "./seed-local-tenant-import.js";
import { seedLocalTenantUiSlicesIfPresent } from "./seed-local-tenant-ui-slices.js";
import { seedRatesEntityUiOverrides } from "./seed-rates-entity-ui-overrides.js";
import { seedRatesUiBuilderPresets } from "./seed-rates-ui-builder-presets.js";
import { seedRatesTenantDashboardLayout } from "./seed-rates-tenant-dashboard-layout.js";
import { seedRatesTenantSidebarLayout } from "./seed-rates-tenant-sidebar-layout.js";
import { seedRatesTenantAppearance } from "./seed-rates-tenant-appearance.js";
import { ensureRatesRole } from "./seed-helpers.js";
import { seedRatesTestUser } from "./seed-rates-test-user.js";

type RatesDemoOwnerStrategy = "localTestUser" | "gcpUid" | "gcpImportOwner";

const EMPTY_COUNTS: {
  created: number;
  updated: number;
  deleted: number;
} = { created: 0, updated: 0, deleted: 0 };

interface SeedRatesTenantOptions {
  readonly tenantId?: string;
  readonly tenantName?: string;
  readonly ensureTenant?: boolean;
  readonly demoOwnerStrategy?: RatesDemoOwnerStrategy;
  readonly backfillMetrics?: boolean;
  readonly localImportOptions?: LocalTenantImportOptions;
  readonly selection?: SeedSelection;
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

function buildLocalImportOptionsFromSelection(
  selection: SeedSelection,
  base: LocalTenantImportOptions | undefined,
): LocalTenantImportOptions | null {
  const full = isFullSeed(selection);
  const localEntities = listSelectedLocalEntityNames(selection);
  const generatedEntities = listSelectedGeneratedEntityNames(selection);
  const includeEmail = selectionIncludes(selection, "emailMatchBindings");
  const runMock = selectionIncludes(selection, "generated");

  const wantsLocal =
    full ||
    (localEntities !== undefined && localEntities.length > 0) ||
    (generatedEntities !== undefined && generatedEntities.length > 0) ||
    includeEmail ||
    runMock;

  if (!wantsLocal) {
    return null;
  }

  if (full) {
    return { ...base };
  }

  return {
    ...base,
    entityNames: localEntities ?? [],
    generatedEntityNames: generatedEntities ?? [],
    recordIds: selection.ids ?? undefined,
    skipOrphanDelete: true,
    runMockGenerator: runMock,
    includeEmailMatchBindings: includeEmail,
    includeEntityImages:
      (localEntities?.includes("actor") ?? false) ||
      (localEntities?.includes("category") ?? false),
  };
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
  const selection: SeedSelection = options.selection ?? {
    components: null,
    ids: null,
  };
  const full = isFullSeed(selection);
  const backfillMetrics =
    options.backfillMetrics ?? selectionIncludes(selection, "metrics-backfill");
  const enableLocalImport =
    demoOwnerStrategy === "localTestUser" ||
    demoOwnerStrategy === "gcpImportOwner";

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

  if (full || selectionIncludes(selection, "platform")) {
    await seedTenantRolesFromTemplates(firebaseAdminConfig, tenantId);
  }

  const wantsAnyCatalog =
    full || selectionIncludesAny(selection, [...SEED_CATALOG_COMPONENTS]);
  const needsDefinitions =
    wantsAnyCatalog ||
    (enableLocalImport &&
      (full ||
        selectionIncludesAny(selection, [
          ...SEED_LOCAL_ENTITY_COMPONENTS,
          ...SEED_GENERATED_ENTITY_COMPONENTS,
          "generated",
          "emailMatchBindings",
          "ui",
          "demo",
        ])));

  let catalogResult: Awaited<ReturnType<typeof seedRatesCatalogs>> = {
    definitionRecords: [],
    entityCounts: { ...EMPTY_COUNTS },
    metricCounts: { ...EMPTY_COUNTS },
    queryCounts: { ...EMPTY_COUNTS },
    chartCounts: { ...EMPTY_COUNTS },
    formulaCounts: { ...EMPTY_COUNTS },
    hookCounts: { ...EMPTY_COUNTS },
    customViewCounts: { ...EMPTY_COUNTS },
  };

  if (needsDefinitions) {
    catalogResult = await seedRatesCatalogs(
      tenantId,
      firebaseAdminConfig,
      entityRuntime,
      full
        ? {}
        : {
            entities: selectionIncludes(selection, "entities"),
            metrics: selectionIncludes(selection, "metrics"),
            queries: selectionIncludes(selection, "queries"),
            hooks: selectionIncludes(selection, "hooks"),
            formulas: selectionIncludes(selection, "formulas"),
            charts: selectionIncludes(selection, "charts"),
            customViews: selectionIncludes(selection, "custom-views"),
          },
    );
  }

  if (full || selectionIncludes(selection, "platform")) {
    if (demoOwnerStrategy === "localTestUser") {
      for (const role of buildRatesCustomRoles()) {
        await ensureRatesRole(roleRepository, tenantId, role);
      }
    }
  }

  let demoOwnerId: string | null = null;
  if (full || selectionIncludes(selection, "platform")) {
    if (demoOwnerStrategy === "localTestUser") {
      demoOwnerId = await seedRatesTestUser(firebaseAdminConfig);
    } else if (demoOwnerStrategy === "gcpUid") {
      demoOwnerId = await seedRatesGcpDemoUserAccess(
        tenantId,
        firebaseAdminConfig,
      );
    }
  }

  let localImportSeeded = false;
  if (enableLocalImport) {
    const localImportOptions = buildLocalImportOptionsFromSelection(
      selection,
      options.localImportOptions,
    );
    if (localImportOptions) {
      const localImportResult = await seedLocalTenantImportIfPresent(
        tenantId,
        firebaseAdminConfig,
        catalogResult.definitionRecords,
        undefined,
        localImportOptions,
      );
      localImportSeeded = localImportResult.seeded;
    }
  }

  // Prefer real `.local/tenant-import` transactions over fictional demo records.
  if (
    demoOwnerId &&
    demoOwnerStrategy === "localTestUser" &&
    (full || selectionIncludes(selection, "demo")) &&
    !localImportSeeded
  ) {
    console.log(
      `[seed] Seeding fictional demo business records for ${RATES_TEST_USER_EMAIL}...`,
    );
    await seedRatesBusinessRecords(
      tenantId,
      firebaseAdminConfig,
      catalogResult.definitionRecords,
      demoOwnerId,
    );
  } else if (
    localImportSeeded &&
    demoOwnerStrategy === "localTestUser" &&
    full
  ) {
    console.log(
      `[seed] Skipping fictional demo business records; local tenant import already seeded real transactions.`,
    );
  }

  if (full || selectionIncludes(selection, "ui")) {
    await seedRatesEntityUiOverrides(
      tenantId,
      firebaseAdminConfig,
      catalogResult.definitionRecords,
    );

    await seedRatesUiBuilderPresets(tenantId, firebaseAdminConfig);

    await seedRatesTenantDashboardLayout(tenantId, firebaseAdminConfig);

    await seedRatesTenantSidebarLayout(tenantId, firebaseAdminConfig);

    await seedRatesTenantAppearance(tenantId, firebaseAdminConfig);

    if (enableLocalImport) {
      await seedLocalTenantUiSlicesIfPresent(
        tenantId,
        firebaseAdminConfig,
        catalogResult.definitionRecords,
      );
    }
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
  selection?: SeedSelection,
): Promise<SeedRatesTenantResult> {
  return seedRatesTenant(firebaseAdminConfig, entityRuntime, {
    tenantId: RATES_TENANT_ID,
    tenantName: RATES_TENANT_NAME,
    demoOwnerStrategy: "localTestUser",
    backfillMetrics: selection
      ? selectionIncludes(selection, "metrics-backfill")
      : true,
    selection,
  });
}

export async function seedRatesTenantGcp(
  firebaseAdminConfig: FirebaseAdminConfig,
  entityRuntime: EntityRuntimeContext,
  selection?: SeedSelection,
): Promise<SeedRatesTenantResult> {
  return seedRatesTenant(firebaseAdminConfig, entityRuntime, {
    tenantId: RATES_TENANT_ID,
    tenantName: RATES_TENANT_NAME,
    demoOwnerStrategy: "gcpImportOwner",
    backfillMetrics: selection
      ? selectionIncludes(selection, "metrics-backfill")
      : true,
    selection,
    localImportOptions: {
      requireOwner: true,
      expectedUid: RATES_GCP_DEMO_OWNER_UID,
    },
  });
}
