import { describe, expect, it } from "vitest";

import {
  filterGlobalSearchHits,
  groupGlobalSearchHitsBySection,
  pickTopGlobalSearchResults,
  scoreGlobalSearchHit,
} from "./global-search-filter";
import type { GlobalSearchHit } from "./global-search-types";

const hits: readonly GlobalSearchHit[] = [
  {
    id: "feature-home",
    section: "features",
    label: "Home",
    description: "Dashboard",
    to: "/",
  },
  {
    id: "entity-actor",
    section: "entities",
    label: "Accounts",
    to: "/app/actor",
  },
  {
    id: "view-upcoming",
    section: "views",
    label: "Upcoming payments",
    to: "/app/views/upcoming-payments",
  },
  {
    id: "feature-ai",
    section: "features",
    label: "AI Chat",
    to: "/ai/chat",
  },
];

describe("global-search-filter", () => {
  it("returns all hits for an empty query", () => {
    expect(filterGlobalSearchHits("", hits)).toEqual(hits);
    expect(filterGlobalSearchHits("   ", hits)).toEqual(hits);
  });

  it("filters by label, description, or path substring", () => {
    expect(filterGlobalSearchHits("account", hits).map((h) => h.id)).toEqual([
      "entity-actor",
    ]);
    expect(filterGlobalSearchHits("dash", hits).map((h) => h.id)).toEqual([
      "feature-home",
    ]);
    expect(
      filterGlobalSearchHits("upcoming-payments", hits).map((h) => h.id),
    ).toEqual(["view-upcoming"]);
  });

  it("scores exact and prefix matches ahead of contains", () => {
    const chat: GlobalSearchHit = {
      id: "feature-ai",
      section: "features",
      label: "AI Chat",
      to: "/ai/chat",
    };
    const chatSettings: GlobalSearchHit = {
      id: "feature-ai-settings",
      section: "features",
      label: "AI",
      to: "/settings/ai",
    };
    const pathOnly: GlobalSearchHit = {
      id: "feature-path",
      section: "features",
      label: "Something else",
      to: "/ai/chat-logs",
    };

    expect(scoreGlobalSearchHit(chatSettings, "ai")).toBe(0);
    expect(scoreGlobalSearchHit(chat, "ai")).toBe(1);
    expect(scoreGlobalSearchHit(pathOnly, "ai")).toBe(4);
  });

  it("picks top results by match quality and groups by section", () => {
    const filtered = filterGlobalSearchHits("a", hits);
    expect(
      pickTopGlobalSearchResults(filtered, "a", 2).map((h) => h.id),
    ).toEqual(["entity-actor", "feature-ai"]);
    expect(pickTopGlobalSearchResults(hits, "", 3)).toEqual([]);
    expect(groupGlobalSearchHitsBySection(hits)).toEqual({
      entities: [hits[1]],
      features: [hits[0], hits[3]],
      views: [hits[2]],
    });
  });

  it("ranks exact record names into Top Results ahead of type hits", () => {
    const merged: readonly GlobalSearchHit[] = [
      {
        id: "entity-org",
        section: "entities",
        label: "Organizations",
        to: "/app/org",
      },
      {
        id: "record-org-a1",
        section: "entities",
        label: "Acme",
        description: "Organizations",
        to: "/app/org/a1",
        entityName: "org",
      },
    ];

    expect(
      pickTopGlobalSearchResults(merged, "Acme", 2).map((h) => h.id),
    ).toEqual(["record-org-a1", "entity-org"]);
  });
});
