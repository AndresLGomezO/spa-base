import { describe, expect, it } from "vitest";

import {
  DESIGN_LAYOUT_DASHBOARD_NAV_ICON,
  DESIGN_LAYOUT_DETAIL_NAV_ICON,
  DESIGN_LAYOUT_FORMS_NAV_ICON,
  DESIGN_LAYOUT_LIST_NAV_ICON,
  DESIGN_LAYOUT_MAIN_NAV_ICON,
  DESIGN_LAYOUT_METRICS_NAV_ICON,
  DESIGN_LAYOUT_PRESETS_NAV_ICON,
} from "../components/sidebar/nav-config";
import type { EntityCatalogEntry } from "../entities/entity-catalog";
import {
  buildDesignLayoutNavLinks,
  DESIGN_LAYOUT_DASHBOARD_NAV_ITEM,
  DESIGN_LAYOUT_PRESETS_NAV_ITEM,
  designLayoutCustomViewPath,
  designLayoutEntityPath,
  designLayoutFormDesignPath,
  designLayoutKindPath,
} from "./design-layout-nav.js";
import {
  decodeDesignLayoutTarget,
  designLayoutTargetPath,
  encodeDesignLayoutTarget,
  getCurrentDesignLayoutTargetValue,
} from "../components/design-layout/design-layout-target.js";

const entityCatalogEntry = (
  name: string,
  overrides: Partial<EntityCatalogEntry> = {},
): EntityCatalogEntry =>
  ({
    name,
    collection: `${name}s`,
    permissions: [`${name}.read`],
    fields: {},
    ui: {
      nav: { label: name, icon: "box" },
      views: [],
      forms: { create: { sections: [] }, edit: { sections: [] } },
      fields: {},
    },
    ...overrides,
  }) as EntityCatalogEntry;

describe("designLayoutEntityPath", () => {
  it("builds metrics layout path with entity query param", () => {
    expect(designLayoutEntityPath("metrics", "account")).toBe(
      "/settings/design-layout/metrics?entity=account",
    );
  });

  it("builds forms layout path with entity query param", () => {
    expect(designLayoutEntityPath("forms", "account")).toBe(
      "/settings/design-layout/forms?entity=account",
    );
  });

  it("preserves unrelated search params", () => {
    expect(
      designLayoutEntityPath("main", "loan", "?tab=layout&entity=deal"),
    ).toBe("/settings/design-layout/main?tab=layout&entity=loan");
  });
});

describe("designLayoutCustomViewPath", () => {
  it("builds custom view path with query param", () => {
    expect(designLayoutCustomViewPath("list", "upcoming-payments")).toBe(
      "/settings/design-layout/list?customView=upcoming-payments",
    );
  });
});

describe("designLayoutFormDesignPath", () => {
  it("builds form design path with entity query param", () => {
    expect(designLayoutFormDesignPath("account", "default")).toBe(
      "/settings/design-layout/forms/default?entity=account",
    );
  });
});

describe("designLayoutKindPath", () => {
  it("builds main layout index path", () => {
    expect(designLayoutKindPath("main")).toBe("/settings/design-layout/main");
  });
});

describe("buildDesignLayoutNavLinks", () => {
  it("returns flat feature links without custom-view entries", () => {
    const links = buildDesignLayoutNavLinks({
      permissions: ["entityUiOverride.read", "loan.read", "deal.read"],
      isSuperAdmin: false,
      entityItems: [entityCatalogEntry("loan"), entityCatalogEntry("deal")],
      metricDefinitions: [],
    });

    expect(links.map((link) => link.id)).toEqual([
      "design-layout-main",
      "design-layout-list",
      "design-layout-detail",
      "design-layout-forms",
    ]);
    expect(links.every((link) => !link.id.includes("custom-view"))).toBe(true);
    expect(links[0]?.to).toBe("/settings/design-layout/main");
  });

  it("returns empty list when no accessible entities", () => {
    expect(
      buildDesignLayoutNavLinks({
        permissions: ["loan.read"],
        isSuperAdmin: false,
        entityItems: [entityCatalogEntry("loan")],
        metricDefinitions: [],
      }),
    ).toEqual([]);
  });
});

describe("design layout nav icons", () => {
  it("assigns distinct icons to presets and dashboard nav items", () => {
    expect(DESIGN_LAYOUT_PRESETS_NAV_ITEM.icon).toBe(
      DESIGN_LAYOUT_PRESETS_NAV_ICON,
    );
    expect(DESIGN_LAYOUT_DASHBOARD_NAV_ITEM.icon).toBe(
      DESIGN_LAYOUT_DASHBOARD_NAV_ICON,
    );
    expect(DESIGN_LAYOUT_PRESETS_NAV_ITEM.icon).not.toBe(
      DESIGN_LAYOUT_DASHBOARD_NAV_ITEM.icon,
    );
  });

  it("uses unique feature icons that do not overlap presets or dashboard", () => {
    const featureIcons = [
      DESIGN_LAYOUT_MAIN_NAV_ICON,
      DESIGN_LAYOUT_LIST_NAV_ICON,
      DESIGN_LAYOUT_DETAIL_NAV_ICON,
      DESIGN_LAYOUT_FORMS_NAV_ICON,
      DESIGN_LAYOUT_METRICS_NAV_ICON,
    ];
    expect(new Set(featureIcons).size).toBe(featureIcons.length);
    expect(featureIcons).not.toContain(DESIGN_LAYOUT_PRESETS_NAV_ICON);
    expect(featureIcons).not.toContain(DESIGN_LAYOUT_DASHBOARD_NAV_ICON);
  });
});

describe("designLayoutTarget", () => {
  it("encodes and decodes entity and custom-view targets", () => {
    const entityTarget = encodeDesignLayoutTarget({
      kind: "entity",
      entityName: "loan",
    });
    const customViewTarget = encodeDesignLayoutTarget({
      kind: "customView",
      customViewId: "upcoming-payments",
    });

    expect(decodeDesignLayoutTarget(entityTarget)).toEqual({
      kind: "entity",
      entityName: "loan",
    });
    expect(decodeDesignLayoutTarget(customViewTarget)).toEqual({
      kind: "customView",
      customViewId: "upcoming-payments",
    });
  });

  it("resolves navigation paths for targets", () => {
    expect(
      designLayoutTargetPath("main", {
        kind: "entity",
        entityName: "loan",
      }),
    ).toBe("/settings/design-layout/main?entity=loan");
    expect(
      designLayoutTargetPath("list", {
        kind: "customView",
        customViewId: "upcoming-payments",
      }),
    ).toBe("/settings/design-layout/list?customView=upcoming-payments");
    expect(
      designLayoutTargetPath("forms", {
        kind: "customView",
        customViewId: "upcoming-payments",
      }),
    ).toBeNull();
  });

  it("selects custom-view value when customViewId is present", () => {
    expect(getCurrentDesignLayoutTargetValue("loan", "upcoming-payments")).toBe(
      "customView:upcoming-payments",
    );
    expect(getCurrentDesignLayoutTargetValue("loan")).toBe("entity:loan");
  });
});
