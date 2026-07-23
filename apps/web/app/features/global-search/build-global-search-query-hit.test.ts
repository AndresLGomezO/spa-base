import { describe, expect, it } from "vitest";

import { buildGlobalSearchQueryHit } from "./build-global-search-query-hit";

describe("buildGlobalSearchQueryHit", () => {
  it("returns null for blank queries", () => {
    expect(buildGlobalSearchQueryHit("")).toBeNull();
    expect(buildGlobalSearchQueryHit("   ")).toBeNull();
  });

  it("builds a recent query hit with stable id and results path", () => {
    expect(buildGlobalSearchQueryHit("  Acme Bank  ")).toEqual({
      id: "query:acme bank",
      section: "queries",
      label: "Acme Bank",
      to: "/search?q=Acme+Bank",
      iconName: "Search",
    });
  });
});
