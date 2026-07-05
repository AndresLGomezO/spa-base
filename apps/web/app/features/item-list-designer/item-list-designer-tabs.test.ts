import { describe, expect, it } from "vitest";

import {
  isItemListDesignerTabId,
  parseItemListDesignerTabId,
} from "./item-list-designer-tabs";

describe("item-list-designer-tabs", () => {
  it("parses valid tab ids from search params", () => {
    expect(parseItemListDesignerTabId("design")).toBe("design");
    expect(parseItemListDesignerTabId("settings")).toBe("settings");
  });

  it("maps legacy columns/layout tabs to design", () => {
    expect(parseItemListDesignerTabId("columns")).toBe("design");
    expect(parseItemListDesignerTabId("layout")).toBe("design");
  });

  it("defaults to settings for missing or invalid tab ids", () => {
    expect(parseItemListDesignerTabId(null)).toBe("settings");
    expect(parseItemListDesignerTabId("invalid")).toBe("settings");
  });

  it("identifies valid tab ids", () => {
    expect(isItemListDesignerTabId("design")).toBe(true);
    expect(isItemListDesignerTabId("columns")).toBe(false);
  });
});
