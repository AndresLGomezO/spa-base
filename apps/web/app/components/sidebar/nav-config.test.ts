import { describe, expect, it } from "vitest";
import { Database } from "lucide-react";

import { isNavGroupActive, isPathActive } from "./nav-config";

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
