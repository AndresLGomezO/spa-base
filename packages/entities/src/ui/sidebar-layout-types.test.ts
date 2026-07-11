import { describe, expect, it } from "vitest";
import { createDefaultUiLayout } from "@repo/ui-builder-core";

import {
  DEFAULT_SIDEBAR_HAMBURGER_BREAKPOINT,
  putTenantSidebarLayoutInputSchema,
  tenantSidebarLayoutRecordSchema,
} from "./sidebar-layout-types.js";
import {
  createEmptyScreenLayout,
  fromPersistedTenantSidebarLayout,
  toPersistedTenantSidebarLayout,
} from "./tenant-sidebar-layout-persistence.js";

describe("sidebar layout types", () => {
  it("defaults hamburgerBreakpoint to md", () => {
    const parsed = putTenantSidebarLayoutInputSchema.parse({
      sidebarLayout: createDefaultUiLayout([]),
      headerLayout: createEmptyScreenLayout(),
      footerLayout: createEmptyScreenLayout(),
      settings: {},
    });

    expect(parsed.settings.hamburgerBreakpoint).toBe(
      DEFAULT_SIDEBAR_HAMBURGER_BREAKPOINT,
    );
    expect(parsed.settings.autoCollapseBreakpoint).toBeUndefined();
  });

  it("round-trips persisted tenant sidebar layout", () => {
    const record = tenantSidebarLayoutRecordSchema.parse({
      tenantId: "tenant-1",
      sidebarLayout: createDefaultUiLayout(["name"]),
      headerLayout: createEmptyScreenLayout(),
      footerLayout: createEmptyScreenLayout(),
      settings: {
        autoCollapseBreakpoint: null,
        hamburgerBreakpoint: "lg",
      },
      updatedAt: new Date().toISOString(),
    }) as import("./sidebar-layout-types.js").TenantSidebarLayoutRecord;

    const persisted = toPersistedTenantSidebarLayout(record);
    const restored = fromPersistedTenantSidebarLayout(persisted);

    expect(restored.tenantId).toBe(record.tenantId);
    expect(restored.sidebarLayout).toEqual(record.sidebarLayout);
    expect(restored.headerLayout).toEqual(record.headerLayout);
    expect(restored.footerLayout).toEqual(record.footerLayout);
    expect(restored.settings).toEqual(record.settings);
    expect(persisted.headerLayoutJson).toBeDefined();
    expect(persisted.footerLayoutJson).toBeDefined();
  });

  it("fills empty header/footer layouts when legacy persisted fields are missing", () => {
    const sidebarLayout = createDefaultUiLayout(["name"]);
    const settings = {
      hamburgerBreakpoint: "md" as const,
    };
    const updatedAt = new Date().toISOString();

    const restored = fromPersistedTenantSidebarLayout({
      tenantId: "tenant-legacy",
      updatedAt,
      sidebarLayoutJson: JSON.stringify(sidebarLayout),
      settingsJson: JSON.stringify(settings),
    });

    expect(restored.sidebarLayout).toEqual(sidebarLayout);
    expect(restored.headerLayout.root.type).toBe("screen-root");
    expect(restored.footerLayout.root.type).toBe("screen-root");
    if (
      restored.headerLayout.root.type === "screen-root" &&
      restored.footerLayout.root.type === "screen-root"
    ) {
      expect(restored.headerLayout.root.rows).toEqual([]);
      expect(restored.footerLayout.root.rows).toEqual([]);
    }
    expect(restored.settings.hamburgerBreakpoint).toBe("md");
  });
});
