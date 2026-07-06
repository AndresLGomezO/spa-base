import { describe, expect, it } from "vitest";

import {
  buildDesignLayoutLocation,
  readDesignLayoutSearchTarget,
} from "./design-layout-search-params";

describe("readDesignLayoutSearchTarget", () => {
  it("reads entity and custom view from search params", () => {
    expect(readDesignLayoutSearchTarget("?entity=loan")).toEqual({
      entityName: "loan",
      customViewId: null,
      hasTarget: true,
    });
    expect(
      readDesignLayoutSearchTarget("?customView=upcoming-payments"),
    ).toEqual({
      entityName: null,
      customViewId: "upcoming-payments",
      hasTarget: true,
    });
    expect(readDesignLayoutSearchTarget("")).toEqual({
      entityName: null,
      customViewId: null,
      hasTarget: false,
    });
  });
});

describe("buildDesignLayoutLocation", () => {
  it("replaces entity param when switching targets", () => {
    const nextLocation = buildDesignLayoutLocation(
      "main",
      { kind: "entity", entityName: "deal" },
      "?entity=loan&tab=layout",
    );
    const params = new URLSearchParams(nextLocation.split("?")[1]);

    expect(nextLocation.startsWith("/settings/design-layout/main?")).toBe(true);
    expect(params.get("entity")).toBe("deal");
    expect(params.get("tab")).toBe("layout");
  });
});
