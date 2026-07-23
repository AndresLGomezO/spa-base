import { describe, expect, it } from "vitest";
import { Home, Bot } from "lucide-react";
import type { CustomViewRecord } from "@repo/custom-views";

import type { NavLinkConfig } from "../../components/sidebar/nav-config";
import type { EntityCatalogEntry } from "../../entities/entity-catalog";
import {
  buildEntityGlobalSearchHits,
  buildFeatureGlobalSearchHits,
  buildViewGlobalSearchHits,
  isEntityOrViewNavPath,
} from "./build-global-search-catalog-hits";

function catalogEntry(overrides: {
  readonly name: string;
  readonly description?: string;
  readonly hiddenFromNav?: boolean;
  readonly ui?: {
    readonly nav?: { readonly label: string; readonly icon?: string };
  };
}): EntityCatalogEntry {
  return {
    collection: overrides.name,
    permissions: [],
    fields: {},
    ui: {
      nav: { label: overrides.name, icon: "Database" },
      views: [],
      forms: { create: { sections: [] }, edit: { sections: [] } },
      ...overrides.ui,
    },
    ...overrides,
  } as EntityCatalogEntry;
}

function customView(
  overrides: Partial<CustomViewRecord> &
    Pick<CustomViewRecord, "viewId" | "sourceEntity" | "name">,
): CustomViewRecord {
  return {
    id: overrides.viewId,
    tenantId: "t1",
    entityQueryDefinitionId: "q1",
    status: "ACTIVE",
    nav: { label: overrides.name, icon: "Clock" },
    ui: { views: [{ id: "v1", type: "table", columns: [] }] },
    createdAt: "2020-01-01T00:00:00.000Z",
    updatedAt: "2020-01-01T00:00:00.000Z",
    ...overrides,
  } as CustomViewRecord;
}

describe("isEntityOrViewNavPath", () => {
  it("detects entity, view, and admin-entity paths", () => {
    expect(isEntityOrViewNavPath("/app/actor")).toBe(true);
    expect(isEntityOrViewNavPath("/app/views/upcoming-payments")).toBe(true);
    expect(isEntityOrViewNavPath("/app/all-entities/actor")).toBe(true);
    expect(isEntityOrViewNavPath("/")).toBe(false);
    expect(isEntityOrViewNavPath("/ai/chat")).toBe(false);
    expect(isEntityOrViewNavPath("/settings/users")).toBe(false);
  });
});

describe("buildEntityGlobalSearchHits", () => {
  const catalog = [
    catalogEntry({
      name: "actor",
      description: "Accounts",
      ui: { nav: { label: "Accounts", icon: "Users" } },
    }),
    catalogEntry({
      name: "internalThing",
      hiddenFromNav: true,
      ui: { nav: { label: "Internal", icon: "Lock" } },
    }),
  ];

  it("includes readable entities and skips unread ones", () => {
    const hits = buildEntityGlobalSearchHits({
      catalog,
      canReadEntity: (name) => name === "actor",
      canBrowseAllEntities: false,
    });

    expect(hits).toEqual([
      {
        id: "entity-actor",
        section: "entities",
        label: "Accounts",
        description: "Accounts",
        to: "/app/actor",
        iconName: "Users",
      },
    ]);
  });

  it("routes hidden entities to admin path when privileged", () => {
    const hits = buildEntityGlobalSearchHits({
      catalog,
      canReadEntity: () => true,
      canBrowseAllEntities: true,
    });

    expect(hits.map((hit) => hit.to)).toEqual([
      "/app/actor",
      "/app/all-entities/internalThing",
    ]);
  });

  it("omits hidden entities when not privileged", () => {
    const hits = buildEntityGlobalSearchHits({
      catalog,
      canReadEntity: () => true,
      canBrowseAllEntities: false,
    });

    expect(hits.map((hit) => hit.id)).toEqual(["entity-actor"]);
  });
});

describe("buildViewGlobalSearchHits", () => {
  const views = [
    customView({
      viewId: "upcoming-payments",
      sourceEntity: "paymentSchedule",
      name: "Upcoming payments",
      description: "Due soon",
    }),
    customView({
      viewId: "paused-view",
      sourceEntity: "actor",
      name: "Paused",
      status: "PAUSED",
    }),
    customView({
      viewId: "hidden-view",
      sourceEntity: "actor",
      name: "Hidden view",
      hiddenFromNav: true,
    }),
  ];

  it("includes ACTIVE views the user can read", () => {
    const hits = buildViewGlobalSearchHits({
      views,
      canReadCustomViews: true,
      canReadEntity: (name) => name === "paymentSchedule",
      canReadInternalEntity: false,
    });

    expect(hits).toEqual([
      {
        id: "view-upcoming-payments",
        section: "views",
        label: "Upcoming payments",
        description: "Due soon",
        to: "/app/views/upcoming-payments",
        iconName: "Clock",
      },
    ]);
  });

  it("requires customView.read and includes hidden views only with internalEntity.read", () => {
    expect(
      buildViewGlobalSearchHits({
        views,
        canReadCustomViews: false,
        canReadEntity: () => true,
        canReadInternalEntity: true,
      }),
    ).toEqual([]);

    const withInternal = buildViewGlobalSearchHits({
      views,
      canReadCustomViews: true,
      canReadEntity: () => true,
      canReadInternalEntity: true,
    });
    expect(withInternal.map((hit) => hit.id)).toContain("view-hidden-view");
  });
});

describe("buildFeatureGlobalSearchHits", () => {
  it("keeps non-entity flat links and maps icon display names", () => {
    const flatLinks: NavLinkConfig[] = [
      {
        id: "home",
        label: "Home",
        to: "/",
        matchPath: "/",
        icon: Home,
      },
      {
        id: "ai-chat",
        labelKey: "aiChat",
        to: "/ai/chat",
        matchPath: "/ai/chat",
        icon: Bot,
      },
      {
        id: "actor",
        label: "Accounts",
        to: "/app/actor",
        matchPath: "/app/actor",
        icon: Home,
      },
    ];

    const hits = buildFeatureGlobalSearchHits({
      flatLinks,
      resolveLabel: (link) => link.label ?? link.id,
    });

    expect(hits.map((hit) => hit.id)).toEqual([
      "feature-home",
      "feature-ai-chat",
    ]);
    expect(hits[0]?.iconName).toBe(Home.displayName);
    expect(hits[1]?.to).toBe("/ai/chat");
  });
});
