import { describe, expect, it } from "vitest";

import {
  appShellDesignFocusToSurface,
  applyAppShellFocusToSearchParams,
  parseAppShellDesignFocus,
} from "./app-shell-designer-tabs";

describe("app-shell-designer-tabs", () => {
  it("defaults focus to sidebar", () => {
    expect(parseAppShellDesignFocus(null)).toBe("sidebar");
    expect(parseAppShellDesignFocus("unknown")).toBe("sidebar");
  });

  it("parses valid focus values", () => {
    expect(parseAppShellDesignFocus("sidebar")).toBe("sidebar");
    expect(parseAppShellDesignFocus("header")).toBe("header");
    expect(parseAppShellDesignFocus("footer")).toBe("footer");
  });

  it("maps focus to design surfaces", () => {
    expect(appShellDesignFocusToSurface("sidebar")).toBe("sidebarLayout");
    expect(appShellDesignFocusToSurface("header")).toBe("headerLayout");
    expect(appShellDesignFocusToSurface("footer")).toBe("footerLayout");
  });

  it("writes focus search params", () => {
    const sidebar = applyAppShellFocusToSearchParams(
      new URLSearchParams("focus=header"),
      "sidebar",
    );
    expect(sidebar.get("focus")).toBeNull();

    const header = applyAppShellFocusToSearchParams(
      new URLSearchParams(),
      "header",
    );
    expect(header.get("focus")).toBe("header");
  });
});
