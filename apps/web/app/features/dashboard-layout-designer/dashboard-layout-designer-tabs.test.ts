import { describe, expect, it } from "vitest";

import {
  isDashboardLayoutDesignerTabId,
  isShellLayoutFocus,
  parseDashboardLayoutDesignFocus,
  parseDashboardLayoutDesignerTabId,
} from "./dashboard-layout-designer-tabs";

describe("dashboard-layout-designer-tabs", () => {
  it("parses the unified design tab", () => {
    expect(parseDashboardLayoutDesignerTabId("design")).toBe("design");
    expect(parseDashboardLayoutDesignerTabId(null)).toBe("design");
  });

  it("maps legacy sections/layout tabs to design", () => {
    expect(parseDashboardLayoutDesignerTabId("sections")).toBe("design");
    expect(parseDashboardLayoutDesignerTabId("layout")).toBe("design");
  });

  it("resolves design focus from focus param and legacy tab aliases", () => {
    expect(parseDashboardLayoutDesignFocus(null, "shell")).toBe("shell");
    expect(parseDashboardLayoutDesignFocus("layout", null)).toBe("shell");
    expect(parseDashboardLayoutDesignFocus("sections", null)).toBe("sections");
    expect(parseDashboardLayoutDesignFocus("design", null)).toBe("sections");
  });

  it("identifies valid tab ids", () => {
    expect(isDashboardLayoutDesignerTabId("design")).toBe(true);
    expect(isDashboardLayoutDesignerTabId("sections")).toBe(false);
  });

  it("detects shell layout focus", () => {
    expect(isShellLayoutFocus("shell")).toBe(true);
    expect(isShellLayoutFocus("sections")).toBe(false);
  });
});
