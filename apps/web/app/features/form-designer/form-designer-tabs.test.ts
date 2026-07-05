import { describe, expect, it } from "vitest";

import {
  isFormDesignerTabId,
  parseFormDesignerTabId,
} from "./form-designer-tabs";

describe("form-designer-tabs", () => {
  it("parses valid tab ids from search params", () => {
    expect(parseFormDesignerTabId("design")).toBe("design");
    expect(parseFormDesignerTabId("settings")).toBe("settings");
  });

  it("maps legacy layout/components tabs to design", () => {
    expect(parseFormDesignerTabId("layout")).toBe("design");
    expect(parseFormDesignerTabId("components")).toBe("design");
  });

  it("defaults to settings for missing or invalid tab ids", () => {
    expect(parseFormDesignerTabId(null)).toBe("settings");
    expect(parseFormDesignerTabId("invalid")).toBe("settings");
  });

  it("identifies valid tab ids", () => {
    expect(isFormDesignerTabId("design")).toBe(true);
    expect(isFormDesignerTabId("layout")).toBe(false);
  });
});
