import { Database, Shield } from "lucide-react";
import { describe, expect, it } from "vitest";

import {
  HOME_NAV_ITEM,
  SETTINGS_ROLES_NAV_ITEM,
  type NavItemConfig,
} from "../components/sidebar/nav-config";

import {
  flattenNavLinks,
  resolveNavPageTitle,
  resolveNavPageTitleFromFlatLinks,
} from "./resolve-nav-page-title";

const ACCOUNTS_NAV_ITEM = {
  id: "accounts",
  label: "Accounts",
  to: "/app/accounts",
  matchPath: "/app/accounts",
  icon: Database,
} as const;

const CUSTOM_VIEW_NAV_ITEM = {
  id: "active-deals",
  label: "Active Deals",
  to: "/app/views/active-deals",
  matchPath: "/app/views/active-deals",
  icon: Database,
} as const;

const NAV_ITEMS: readonly NavItemConfig[] = [
  HOME_NAV_ITEM,
  ACCOUNTS_NAV_ITEM,
  CUSTOM_VIEW_NAV_ITEM,
  SETTINGS_ROLES_NAV_ITEM,
];

describe("flattenNavLinks", () => {
  it("flattens top-level links and nested group children", () => {
    expect(
      flattenNavLinks([
        HOME_NAV_ITEM,
        {
          id: "settings",
          label: "Settings",
          matchPath: "/settings",
          icon: Shield,
          children: [SETTINGS_ROLES_NAV_ITEM],
        },
      ]),
    ).toEqual([HOME_NAV_ITEM, SETTINGS_ROLES_NAV_ITEM]);
  });
});

describe("resolveNavPageTitle", () => {
  it("returns Home for the dashboard route", () => {
    expect(
      resolveNavPageTitle("/", NAV_ITEMS, (link) =>
        link.id === "home" ? "Home" : null,
      ),
    ).toBe("Home");
  });

  it("returns entity label for entity list routes", () => {
    expect(resolveNavPageTitle("/app/accounts", NAV_ITEMS)).toBe("Accounts");
  });

  it("returns entity label for entity edit and new routes", () => {
    expect(resolveNavPageTitle("/app/accounts/abc123", NAV_ITEMS)).toBe(
      "Accounts",
    );
    expect(resolveNavPageTitle("/app/accounts/new", NAV_ITEMS)).toBe(
      "Accounts",
    );
  });

  it("returns custom view label for custom view routes", () => {
    expect(resolveNavPageTitle("/app/views/active-deals", NAV_ITEMS)).toBe(
      "Active Deals",
    );
  });

  it("returns settings nav label for settings routes", () => {
    expect(
      resolveNavPageTitle("/settings/roles", NAV_ITEMS, (link) =>
        link.id === "roles" ? "Roles & Permissions" : null,
      ),
    ).toBe("Roles & Permissions");
  });

  it("prefers the longest matching nav path", () => {
    const navItems: readonly NavItemConfig[] = [
      {
        id: "settings",
        label: "Settings",
        matchPath: "/settings",
        icon: Shield,
        children: [SETTINGS_ROLES_NAV_ITEM],
      },
      SETTINGS_ROLES_NAV_ITEM,
    ];

    expect(
      resolveNavPageTitle("/settings/roles", navItems, (link) =>
        link.id === "roles" ? "Roles & Permissions" : null,
      ),
    ).toBe("Roles & Permissions");
  });

  it("returns null when no nav item matches", () => {
    expect(resolveNavPageTitle("/unknown/path", NAV_ITEMS)).toBeNull();
  });
});

describe("resolveNavPageTitleFromFlatLinks", () => {
  it("returns the label for a pre-sorted flat link match", () => {
    const flatLinks = [...flattenNavLinks(NAV_ITEMS)].sort(
      (left, right) => right.matchPath.length - left.matchPath.length,
    );

    expect(resolveNavPageTitleFromFlatLinks("/app/accounts", flatLinks)).toBe(
      "Accounts",
    );
  });
});
