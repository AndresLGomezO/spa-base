import { describe, expect, it } from "vitest";

import {
  applySectionSelectionToSearchParams,
  DASHBOARD_LAYOUT_DESIGNER_SECTION_SEARCH_PARAM,
  getDashboardLayoutDesignerSectionId,
} from "./dashboard-layout-designer-section-selection";

describe("dashboard layout designer section selection URL helpers", () => {
  it("reads selected section id from search params", () => {
    const params = new URLSearchParams({
      [DASHBOARD_LAYOUT_DESIGNER_SECTION_SEARCH_PARAM]: "account-metrics",
    });
    expect(getDashboardLayoutDesignerSectionId(params)).toBe("account-metrics");
  });

  it("writes and clears selected section id in search params", () => {
    const params = new URLSearchParams({ focus: "shell" });
    const withSelection = applySectionSelectionToSearchParams(
      params,
      "financial-snapshot",
    );
    expect(
      withSelection.get(DASHBOARD_LAYOUT_DESIGNER_SECTION_SEARCH_PARAM),
    ).toBe("financial-snapshot");
    expect(withSelection.get("focus")).toBe("shell");

    const cleared = applySectionSelectionToSearchParams(withSelection, "");
    expect(
      cleared.get(DASHBOARD_LAYOUT_DESIGNER_SECTION_SEARCH_PARAM),
    ).toBeNull();
    expect(cleared.get("focus")).toBe("shell");
  });
});
