import { describe, expect, it } from "vitest";

import {
  isFormDesignerTabId,
  parseFormDesignerTabId,
} from "./form-designer-tabs";

describe("form-designer-tabs", () => {
  it("parses valid tab ids from search params", () => {
    expect(parseFormDesignerTabId("layout")).toBe("layout");
    expect(parseFormDesignerTabId("components")).toBe("components");
    expect(parseFormDesignerTabId("settings")).toBe("settings");
  });

  it("defaults to settings for missing or invalid tab ids", () => {
    expect(parseFormDesignerTabId(null)).toBe("settings");
    expect(parseFormDesignerTabId("invalid")).toBe("settings");
  });

  it("identifies valid tab ids", () => {
    expect(isFormDesignerTabId("layout")).toBe(true);
    expect(isFormDesignerTabId("unknown")).toBe(false);
  });
});
