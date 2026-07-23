import { describe, expect, it } from "vitest";

import {
  buildGlobalSearchResultsPath,
  readGlobalSearchResultsUrlState,
  writeGlobalSearchResultsUrlState,
} from "./global-search-results-url";

describe("global-search-results-url", () => {
  it("reads defaults and known params", () => {
    expect(readGlobalSearchResultsUrlState(new URLSearchParams())).toEqual({
      q: "",
      tab: "all",
      sort: "relevance",
    });

    const params = new URLSearchParams(
      "q=cloud&tab=features&sort=nameAsc&ignored=1",
    );
    expect(readGlobalSearchResultsUrlState(params)).toEqual({
      q: "cloud",
      tab: "features",
      sort: "nameAsc",
    });
  });

  it("omits default tab and sort when writing", () => {
    const params = writeGlobalSearchResultsUrlState(new URLSearchParams(), {
      q: "run",
      tab: "all",
      sort: "relevance",
    });
    expect(params.toString()).toBe("q=run");

    const withTab = writeGlobalSearchResultsUrlState(params, {
      tab: "emailMessage",
      sort: "nameDesc",
    });
    expect(withTab.get("tab")).toBe("emailMessage");
    expect(withTab.get("sort")).toBe("nameDesc");
  });

  it("builds a results path", () => {
    expect(buildGlobalSearchResultsPath({ q: "home" })).toBe("/search?q=home");
    expect(buildGlobalSearchResultsPath({ q: "" })).toBe("/search");
  });
});
