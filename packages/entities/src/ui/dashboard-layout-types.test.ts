import { describe, expect, it } from "vitest";
import { createDefaultUiLayout } from "@repo/ui-builder-core";

import {
  dashboardSectionDefinitionSchema,
  putTenantDashboardLayoutInputSchema,
  tenantDashboardLayoutRecordSchema,
} from "./dashboard-layout-types.js";
import {
  fromPersistedTenantDashboardLayout,
  toPersistedTenantDashboardLayout,
} from "./tenant-dashboard-layout-persistence.js";

describe("dashboard layout types", () => {
  it("parses tenant dashboard layout config", () => {
    const parsed = putTenantDashboardLayoutInputSchema.parse({
      dashboardSections: [],
      dashboardLayout: createDefaultUiLayout([]),
    });

    expect(parsed.dashboardSections).toEqual([]);
  });

  it("round-trips persisted tenant dashboard layout", () => {
    const record = tenantDashboardLayoutRecordSchema.parse({
      tenantId: "tenant-1",
      dashboardSections: [
        {
          id: "section-1",
          name: "KPIs",
          layout: createDefaultUiLayout(["name"]),
        },
      ],
      dashboardLayout: createDefaultUiLayout(["name"]),
      updatedAt: new Date().toISOString(),
    }) as import("./dashboard-layout-types.js").TenantDashboardLayoutRecord;

    const persisted = toPersistedTenantDashboardLayout(record);
    const restored = fromPersistedTenantDashboardLayout(persisted);

    expect(restored.tenantId).toBe(record.tenantId);
    expect(restored.dashboardSections).toEqual(record.dashboardSections);
  });

  it("validates dashboard section definitions", () => {
    const section = dashboardSectionDefinitionSchema.parse({
      id: "section-1",
      name: "Overview",
      layout: createDefaultUiLayout(["name"]),
    });

    expect(section.name).toBe("Overview");
  });
});
