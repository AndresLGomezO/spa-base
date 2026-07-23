import { describe, expect, it } from "vitest";

import {
  countHitsByTab,
  filterHitsByTab,
  getGlobalSearchHitKind,
  getGlobalSearchHitTab,
  resolveActiveGlobalSearchTab,
  resolveGlobalSearchTabLabel,
  sortGlobalSearchHits,
  visibleGlobalSearchResultsTabs,
} from "./global-search-hit-tabs";
import type { GlobalSearchHit } from "./global-search-types";

const hits: readonly GlobalSearchHit[] = [
  {
    id: "feature-home",
    section: "features",
    label: "Home",
    to: "/",
  },
  {
    id: "entity-org",
    section: "entities",
    label: "Organizations",
    to: "/app/org",
  },
  {
    id: "record-org-1",
    section: "entities",
    label: "Acme",
    description: "Organizations",
    to: "/app/org/1",
    entityName: "org",
  },
  {
    id: "view-upcoming",
    section: "views",
    label: "Upcoming",
    to: "/app/views/upcoming-payments",
  },
  {
    id: "record-email-1",
    section: "entities",
    label: "Uber receipt",
    description: "Emails",
    to: "/app/emailMessage/1",
    entityName: "emailMessage",
  },
];

describe("global-search-hit-tabs", () => {
  it("classifies hit kinds and tabs", () => {
    expect(getGlobalSearchHitKind(hits[0]!)).toBe("features");
    expect(getGlobalSearchHitKind(hits[1]!)).toBe("types");
    expect(getGlobalSearchHitKind(hits[2]!)).toBe("records");
    expect(getGlobalSearchHitKind(hits[3]!)).toBe("views");
    expect(getGlobalSearchHitTab(hits[2]!)).toBe("org");
    expect(getGlobalSearchHitTab(hits[4]!)).toBe("emailMessage");
  });

  it("counts and filters tabs, including dynamic entity tabs", () => {
    const counts = countHitsByTab(hits);
    expect(counts).toEqual({
      all: 5,
      features: 1,
      views: 1,
      types: 1,
      org: 1,
      emailMessage: 1,
    });
    expect(visibleGlobalSearchResultsTabs(counts, hits)).toEqual([
      "all",
      "features",
      "views",
      "types",
      "emailMessage",
      "org",
    ]);
    expect(filterHitsByTab(hits, "org").map((h) => h.id)).toEqual([
      "record-org-1",
    ]);
  });

  it("falls back to all when the active tab is empty", () => {
    const counts = countHitsByTab(hits);
    expect(resolveActiveGlobalSearchTab("missingEntity", counts)).toBe("all");
    expect(resolveActiveGlobalSearchTab("org", counts)).toBe("org");
  });

  it("resolves static and dynamic tab labels", () => {
    expect(
      resolveGlobalSearchTabLabel({
        tab: "features",
        hits,
        translateStatic: (tab) => tab.toUpperCase(),
      }),
    ).toBe("FEATURES");
    expect(
      resolveGlobalSearchTabLabel({
        tab: "emailMessage",
        hits,
        translateStatic: (tab) => tab,
      }),
    ).toBe("Emails");
  });

  it("sorts by name and relevance", () => {
    expect(
      sortGlobalSearchHits(hits, "nameAsc", "").map((h) => h.label),
    ).toEqual(["Acme", "Home", "Organizations", "Uber receipt", "Upcoming"]);
    expect(
      sortGlobalSearchHits(hits, "nameDesc", "").map((h) => h.label),
    ).toEqual(["Upcoming", "Uber receipt", "Organizations", "Home", "Acme"]);
    expect(
      sortGlobalSearchHits(hits, "relevance", "Acme").map((h) => h.id)[0],
    ).toBe("record-org-1");
  });
});
