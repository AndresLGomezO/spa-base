import { beforeEach, describe, expect, it, vi } from "vitest";

import { RATES_GCP_DEMO_OWNER_UID } from "./constants.js";

const {
  seedRatesTestUser,
  seedRatesBusinessRecords,
  seedLocalTenantImportIfPresent,
  seedRatesCatalogs,
  activateAndBackfillRatesMetrics,
} = vi.hoisted(() => ({
  seedRatesTestUser: vi.fn(),
  seedRatesBusinessRecords: vi.fn(),
  seedLocalTenantImportIfPresent: vi.fn(),
  seedRatesCatalogs: vi.fn(),
  activateAndBackfillRatesMetrics: vi.fn(),
}));

vi.mock("./seed-rates-test-user.js", () => ({
  seedRatesTestUser,
}));

vi.mock("./records/index.js", () => ({
  seedRatesBusinessRecords,
}));

vi.mock("./seed-local-tenant-import.js", () => ({
  seedLocalTenantImportIfPresent,
}));

vi.mock("../seed-tenant-roles-from-templates.js", () => ({
  seedTenantRolesFromTemplates: vi.fn(),
}));

vi.mock("./seed-rates-catalogs.js", () => ({
  seedRatesCatalogs,
}));

vi.mock("./backfill-rates-metrics.js", () => ({
  activateAndBackfillRatesMetrics,
}));

vi.mock("./seed-rates-entity-ui-overrides.js", () => ({
  seedRatesEntityUiOverrides: vi.fn(),
}));

vi.mock("./seed-rates-ui-builder-presets.js", () => ({
  seedRatesUiBuilderPresets: vi.fn(),
}));

vi.mock("./seed-rates-tenant-dashboard-layout.js", () => ({
  seedRatesTenantDashboardLayout: vi.fn(),
}));

vi.mock("./seed-rates-tenant-sidebar-layout.js", () => ({
  seedRatesTenantSidebarLayout: vi.fn(),
}));

vi.mock("./seed-rates-tenant-appearance.js", () => ({
  seedRatesTenantAppearance: vi.fn(),
}));

vi.mock("./seed-local-tenant-ui-slices.js", () => ({
  seedLocalTenantUiSlicesIfPresent: vi.fn(),
}));

vi.mock("@repo/gcp-firebase", () => ({
  createFirestoreAdminTenantRepository: vi.fn(() => ({
    getById: vi.fn(),
    create: vi.fn(),
  })),
  createFirestoreAdminTenantRoleRepository: vi.fn(() => ({
    getByName: vi.fn(async () => null),
    create: vi.fn(),
  })),
}));

import {
  seedRatesTenantGcp,
  seedRatesTenantMock,
} from "./seed-rates-tenant.js";

const firebaseAdminConfig = { projectId: "entitysystem-development" };
const entityRuntime = {} as never;

describe("seedRatesTenantGcp", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    seedRatesCatalogs.mockResolvedValue({
      definitionRecords: [],
      entityCounts: { created: 0, updated: 0, deleted: 0 },
      metricCounts: { created: 0, updated: 0, deleted: 0 },
      queryCounts: { created: 0, updated: 0, deleted: 0 },
    });
    activateAndBackfillRatesMetrics.mockResolvedValue({ failures: [] });
    seedLocalTenantImportIfPresent.mockResolvedValue({
      seeded: true,
      ownerEmail: "andreslgomezo@gmail.com",
    });
  });

  it("skips emulator test user and fictional demo records", async () => {
    await seedRatesTenantGcp(firebaseAdminConfig, entityRuntime);

    expect(seedRatesTestUser).not.toHaveBeenCalled();
    expect(seedRatesBusinessRecords).not.toHaveBeenCalled();
  });

  it("imports local tenant data with strict owner validation options", async () => {
    await seedRatesTenantGcp(firebaseAdminConfig, entityRuntime);

    expect(seedLocalTenantImportIfPresent).toHaveBeenCalledWith(
      "rates",
      firebaseAdminConfig,
      [],
      undefined,
      expect.objectContaining({
        requireOwner: true,
        expectedUid: RATES_GCP_DEMO_OWNER_UID,
      }),
    );
  });

  it("seeds only selected catalog components without local import", async () => {
    const { seedLocalTenantUiSlicesIfPresent } = await import(
      "./seed-local-tenant-ui-slices.js"
    );
    const { seedRatesEntityUiOverrides } = await import(
      "./seed-rates-entity-ui-overrides.js"
    );

    await seedRatesTenantGcp(firebaseAdminConfig, entityRuntime, {
      components: new Set(["hooks"]),
      ids: null,
    });

    expect(seedRatesCatalogs).toHaveBeenCalledWith(
      "rates",
      firebaseAdminConfig,
      entityRuntime,
      expect.objectContaining({
        hooks: true,
        entities: false,
        metrics: false,
      }),
    );
    expect(seedLocalTenantImportIfPresent).not.toHaveBeenCalled();
    expect(activateAndBackfillRatesMetrics).not.toHaveBeenCalled();
    expect(seedRatesEntityUiOverrides).not.toHaveBeenCalled();
    expect(seedLocalTenantUiSlicesIfPresent).not.toHaveBeenCalled();
  });
});

describe("seedRatesTenantMock", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    seedRatesCatalogs.mockResolvedValue({
      definitionRecords: [],
      entityCounts: { created: 0, updated: 0, deleted: 0 },
      metricCounts: { created: 0, updated: 0, deleted: 0 },
      queryCounts: { created: 0, updated: 0, deleted: 0 },
    });
    activateAndBackfillRatesMetrics.mockResolvedValue({ failures: [] });
    seedRatesTestUser.mockResolvedValue("test-user");
  });

  it("skips fictional demo records when local tenant import seeds real data", async () => {
    seedLocalTenantImportIfPresent.mockResolvedValue({
      seeded: true,
      ownerEmail: "andreslgomezo@gmail.com",
    });

    await seedRatesTenantMock(firebaseAdminConfig, entityRuntime);

    expect(seedLocalTenantImportIfPresent).toHaveBeenCalled();
    expect(seedRatesBusinessRecords).not.toHaveBeenCalled();
  });

  it("seeds fictional demo records only when local tenant import did not seed", async () => {
    seedLocalTenantImportIfPresent.mockResolvedValue({
      seeded: false,
      ownerEmail: null,
    });

    await seedRatesTenantMock(firebaseAdminConfig, entityRuntime);

    expect(seedRatesBusinessRecords).toHaveBeenCalled();
  });

  it("passes record id filters for partial local import", async () => {
    seedLocalTenantImportIfPresent.mockResolvedValue({
      seeded: true,
      ownerEmail: "andreslgomezo@gmail.com",
    });

    const hubId = "7c2e9f11-2518-4b3a-9d4e-030cd8568c15";
    await seedRatesTenantMock(firebaseAdminConfig, entityRuntime, {
      components: new Set(["financialItem", "emailMatchBindings"]),
      ids: new Set([hubId]),
    });

    expect(seedLocalTenantImportIfPresent).toHaveBeenCalledWith(
      "rates",
      firebaseAdminConfig,
      [],
      undefined,
      expect.objectContaining({
        entityNames: ["financialItem"],
        generatedEntityNames: [],
        recordIds: new Set([hubId]),
        skipOrphanDelete: true,
        runMockGenerator: false,
        includeEmailMatchBindings: true,
      }),
    );
    expect(seedRatesBusinessRecords).not.toHaveBeenCalled();
    expect(activateAndBackfillRatesMetrics).not.toHaveBeenCalled();
  });
});
