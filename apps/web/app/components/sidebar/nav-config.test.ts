import { describe, expect, it } from "vitest";
import { Database } from "lucide-react";

import {
  isNavGroupActive,
  isNavSubGroupActive,
  isPathActive,
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
