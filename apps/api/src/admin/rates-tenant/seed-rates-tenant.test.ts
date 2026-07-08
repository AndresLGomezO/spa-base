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
  createFirestoreAdminTenantRoleRepository: vi.fn(() => ({})),
}));

import { seedRatesTenantGcp } from "./seed-rates-tenant.js";

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
      {
        requireOwner: true,
        expectedUid: RATES_GCP_DEMO_OWNER_UID,
      },
    );
  });
});
