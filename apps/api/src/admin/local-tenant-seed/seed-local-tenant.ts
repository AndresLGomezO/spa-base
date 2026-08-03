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
  type SeedSelection,
} from "../../scripts/seed-selection.js";
import { seedTenantRolesFromTemplates } from "../seed-tenant-roles-from-templates.js";
import { activateAndBackfillLocalMetrics } from "./backfill-local-metrics.js";
import {
  loadLocalTenantConfig,
  type LocalTenantConfig,
} from "./load-tenant-config.js";
import { buildLocalCustomRoles } from "./roles.js";
import { seedLocalCatalogs } from "./seed-local-catalogs.js";
import { seedLocalGcpDemoUserAccess } from "./seed-gcp-demo-user-access.js";
import {
  seedLocalTenantImportIfPresent,
  type LocalTenantImportOptions,
} from "./seed-local-tenant-import.js";
import { seedLocalTenantUiSlicesIfPresent } from "./seed-local-tenant-ui-slices.js";
import { seedLocalEntityUiOverrides } from "./seed-entity-ui-overrides.js";
import { seedLocalUiBuilderPresets } from "./seed-ui-builder-presets.js";
import { seedLocalTenantDashboardLayout } from "./seed-tenant-dashboard-layout.js";
import { seedLocalTenantSidebarLayout } from "./seed-tenant-sidebar-layout.js";
import { seedLocalTenantAppearance } from "./seed-tenant-appearance.js";
import { ensureLocalTenantRole } from "./seed-helpers.js";
import { seedLocalTestUser } from "./seed-local-test-user.js";

type LocalDemoOwnerStrategy = "localTestUser" | "gcpUid" | "gcpImportOwner";

const EMPTY_COUNTS: {
  created: number;
  updated: number;
  deleted: number;
} = { created: 0, updated: 0, deleted: 0 };

interface SeedLocalTenantOptions {
  readonly tenantId?: string;
  readonly tenantName?: string;
  readonly ensureTenant?: boolean;
  readonly demoOwnerStrategy?: LocalDemoOwnerStrategy;
  readonly backfillMetrics?: boolean;
  readonly localImportOptions?: LocalTenantImportOptions;
  readonly selection?: SeedSelection;
  readonly config?: LocalTenantConfig;
}

interface SeedLocalTenantResult {
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
    includeEntityImages: (localEntities?.length ?? 0) > 0,
    dropExisting: selection.drop,
  };
}

async function seedLocalTenant(
  firebaseAdminConfig: FirebaseAdminConfig,
  entityRuntime: EntityRuntimeContext,
  options: SeedLocalTenantOptions = {},
): Promise<SeedLocalTenantResult> {
  const config = options.config ?? loadLocalTenantConfig();
  const tenantId = options.tenantId ?? config.id;
  const tenantName = options.tenantName ?? config.name;
  const ensureTenant = options.ensureTenant ?? false;
  const demoOwnerStrategy = options.demoOwnerStrategy ?? "localTestUser";
  const selection: SeedSelection = options.selection ?? {
    components: null,
    ids: null,
    drop: false,
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

  const localEntities = listSelectedLocalEntityNames(selection);
  const generatedEntities = listSelectedGeneratedEntityNames(selection);

  const wantsAnyCatalog =
    full || selectionIncludesAny(selection, [...SEED_CATALOG_COMPONENTS]);
  const needsDefinitions =
    wantsAnyCatalog ||
    (enableLocalImport &&
      (full ||
        (localEntities !== undefined && localEntities.length > 0) ||
        (generatedEntities !== undefined && generatedEntities.length > 0) ||
        selectionIncludes(selection, "emailMatchBindings") ||
        selectionIncludes(selection, "ui") ||
        selectionIncludes(selection, "demo") ||
        selectionIncludes(selection, "generated")));

  let catalogResult: Awaited<ReturnType<typeof seedLocalCatalogs>> = {
    definitionRecords: [],
    entityCounts: { ...EMPTY_COUNTS },
    metricCounts: { ...EMPTY_COUNTS },
    queryCounts: { ...EMPTY_COUNTS },
    chartCounts: { ...EMPTY_COUNTS },
    insightSurfaceCounts: { ...EMPTY_COUNTS },
    documentExtractionTemplateCounts: { ...EMPTY_COUNTS },
    formulaCounts: { ...EMPTY_COUNTS },
    hookCounts: { ...EMPTY_COUNTS },
    customViewCounts: { ...EMPTY_COUNTS },
    localePackCounts: { ...EMPTY_COUNTS },
  };

  if (needsDefinitions) {
    catalogResult = await seedLocalCatalogs(
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
            insightSurfaces: selectionIncludes(selection, "insight-surfaces"),
            documentExtractionTemplates: selectionIncludes(
              selection,
              "document-extraction-templates",
            ),
            customViews: selectionIncludes(selection, "custom-views"),
            localePacks: selectionIncludes(selection, "locale-packs"),
          },
    );
  }

  if (full || selectionIncludes(selection, "platform")) {
    if (demoOwnerStrategy === "localTestUser") {
      for (const role of buildLocalCustomRoles(config)) {
        await ensureLocalTenantRole(roleRepository, tenantId, role);
      }
    }
  }

  let demoOwnerId: string | null = null;
  if (full || selectionIncludes(selection, "platform")) {
    if (demoOwnerStrategy === "localTestUser") {
      demoOwnerId = await seedLocalTestUser(firebaseAdminConfig, config);
    } else if (demoOwnerStrategy === "gcpUid") {
      demoOwnerId = await seedLocalGcpDemoUserAccess(
        tenantId,
        firebaseAdminConfig,
        config,
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

  if (localImportSeeded && demoOwnerStrategy === "localTestUser" && full) {
    console.log(`[seed] Local tenant import seeded business records.`);
  } else if (
    demoOwnerStrategy === "localTestUser" &&
    (full || selectionIncludes(selection, "demo")) &&
    !localImportSeeded
  ) {
    console.log(
      `[seed] Skipping fictional demo business records; place records under .local/tenant-import/records/ to seed data.`,
    );
  }

  if (full || selectionIncludes(selection, "ui")) {
    await seedLocalEntityUiOverrides(
      tenantId,
      firebaseAdminConfig,
      catalogResult.definitionRecords,
    );

    await seedLocalUiBuilderPresets(tenantId, firebaseAdminConfig);

    await seedLocalTenantDashboardLayout(tenantId, firebaseAdminConfig);

    await seedLocalTenantSidebarLayout(tenantId, firebaseAdminConfig);

    await seedLocalTenantAppearance(tenantId, firebaseAdminConfig);

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
    const backfillResult = await activateAndBackfillLocalMetrics(
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

export async function seedLocalTenantMock(
  firebaseAdminConfig: FirebaseAdminConfig,
  entityRuntime: EntityRuntimeContext,
  selection?: SeedSelection,
  config?: LocalTenantConfig,
): Promise<SeedLocalTenantResult> {
  const resolved = config ?? loadLocalTenantConfig();
  return seedLocalTenant(firebaseAdminConfig, entityRuntime, {
    tenantId: resolved.id,
    tenantName: resolved.name,
    demoOwnerStrategy: "localTestUser",
    backfillMetrics: selection
      ? selectionIncludes(selection, "metrics-backfill")
      : true,
    selection,
    config: resolved,
  });
}

export async function seedLocalTenantGcp(
  firebaseAdminConfig: FirebaseAdminConfig,
  entityRuntime: EntityRuntimeContext,
  selection?: SeedSelection,
  config?: LocalTenantConfig,
): Promise<SeedLocalTenantResult> {
  const resolved = config ?? loadLocalTenantConfig();
  return seedLocalTenant(firebaseAdminConfig, entityRuntime, {
    tenantId: resolved.id,
    tenantName: resolved.name,
    demoOwnerStrategy: "gcpImportOwner",
    backfillMetrics: selection
      ? selectionIncludes(selection, "metrics-backfill")
      : true,
    selection,
    config: resolved,
    localImportOptions: {
      requireOwner: true,
      expectedUid: resolved.gcpDemoOwnerUid,
    },
  });
}
