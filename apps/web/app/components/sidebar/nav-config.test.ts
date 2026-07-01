import { describe, expect, it } from "vitest";
import { Database } from "lucide-react";

import {
  buildAdminEntityNavMatchPath,
  findFirstSystemConfigNavIndex,
  isNavGroupActive,
  isNavSubGroupActive,
  isPathActive,
  shouldShowSystemConfigurationNavSection,
} from "./nav-config";

describe("isNavGroupActive", () => {
  it("is active only when a child route matches", () => {
    const group = {
      id: "category-sales",
      label: "Sales",
      matchPath: "/app",
      icon: Database,
      children: [
        {
          id: "deal",
          label: "Deals",
          to: "/app/deal",
          matchPath: "/app/deal",
          icon: Database,
        },
        {
          id: "lead",
          label: "Leads",
          to: "/app/lead",
          matchPath: "/app/lead",
          icon: Database,
        },
      ],
    };

    expect(isNavGroupActive("/app/deal", group)).toBe(true);
    expect(isNavGroupActive("/app/deal/new", group)).toBe(true);
    expect(isNavGroupActive("/app/lead", group)).toBe(true);
    expect(isNavGroupActive("/app/widget", group)).toBe(false);
    expect(isPathActive("/app/deal", "/app")).toBe(true);
    expect(isNavGroupActive("/app/deal", group)).toBe(true);
  });
});

describe("buildAdminEntityNavMatchPath", () => {
  it("uses a dedicated admin entity route prefix", () => {
    expect(buildAdminEntityNavMatchPath("widget")).toBe(
      "/app/all-entities/widget",
    );
    expect(buildAdminEntityNavMatchPath("internalEntity")).toBe(
      "/app/all-entities/internalEntity",
    );
  });

  it("activates only the matching admin entity route", () => {
    const subgroup = {
      id: "all-entities",
      labelKey: "allEntities" as const,
      children: [
        {
          id: "admin-entity-widget",
          label: "Widget",
          to: "/app/all-entities/widget",
          matchPath: buildAdminEntityNavMatchPath("widget"),
          icon: Database,
        },
        {
          id: "admin-entity-internalEntity",
          label: "Internal Entity",
          to: "/app/all-entities/internalEntity",
          matchPath: buildAdminEntityNavMatchPath("internalEntity"),
          icon: Database,
        },
      ],
    };

    expect(isNavSubGroupActive("/app/all-entities/widget", subgroup)).toBe(
      true,
    );
    expect(isNavSubGroupActive("/app/widget", subgroup)).toBe(false);
    expect(
      isNavSubGroupActive("/app/all-entities/internalEntity", subgroup),
    ).toBe(true);
    expect(isNavSubGroupActive("/app/internalEntity", subgroup)).toBe(false);
  });
});

describe("isNavSubGroupActive", () => {
  it("is active when a child route matches", () => {
    const subgroup = {
      id: "design-layout-list",
      label: "Item list",
      children: [
        {
          id: "account",
          label: "Account",
          to: "/settings/design-layout/list/account",
          matchPath: "/settings/design-layout/list/account",
          icon: Database,
        },
      ],
    };

    expect(
      isNavSubGroupActive("/settings/design-layout/list/account", subgroup),
    ).toBe(true);
    expect(
      isNavSubGroupActive("/settings/design-layout/page/account", subgroup),
    ).toBe(false);
  });

  it("is active for metrics layout routes", () => {
    const subgroup = {
      id: "design-layout-metrics",
      labelKey: "designLayoutMetrics" as const,
      children: [
        {
          id: "account-metrics",
          label: "Account",
          to: "/settings/design-layout/metrics/account",
          matchPath: "/settings/design-layout/metrics/account",
          icon: Database,
        },
      ],
    };

    expect(
      isNavSubGroupActive("/settings/design-layout/metrics/account", subgroup),
    ).toBe(true);
    expect(
      isNavSubGroupActive("/settings/design-layout/main/account", subgroup),
    ).toBe(false);
  });
});

describe("system configuration nav section", () => {
  it("detects the first system configuration group", () => {
    const items = [
      { id: "home" },
      { id: "data-models" },
      { id: "category-sales" },
      { id: "data-structure" },
      { id: "settings" },
    ];

    expect(findFirstSystemConfigNavIndex(items)).toBe(3);
  });

  it("shows the section header when data entities precede system configuration", () => {
    const items = [
      { id: "home" },
      { id: "category-sales" },
      { id: "settings" },
    ];

    expect(shouldShowSystemConfigurationNavSection(items)).toBe(true);
  });

  it("hides the section header for viewers without system configuration", () => {
    const items = [{ id: "home" }, { id: "data-models" }];

    expect(shouldShowSystemConfigurationNavSection(items)).toBe(false);
  });

  it("hides the section header when system configuration has no entity groups above it", () => {
    const items = [{ id: "home" }, { id: "settings" }];

    expect(shouldShowSystemConfigurationNavSection(items)).toBe(false);
  });
});
