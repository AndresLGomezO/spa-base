import { describe, expect, it } from "vitest";

import {
  applyWidgetSelectionToSearchParams,
  getMetricsRowDesignerWidgetId,
  METRICS_ROW_DESIGNER_WIDGET_SEARCH_PARAM,
} from "./metrics-row-designer-widget-selection";

describe("metrics row designer widget selection URL helpers", () => {
  it("reads selected widget id from search params", () => {
    const params = new URLSearchParams({
      [METRICS_ROW_DESIGNER_WIDGET_SEARCH_PARAM]: "upcoming-payments-dashboard",
    });
    expect(getMetricsRowDesignerWidgetId(params)).toBe(
      "upcoming-payments-dashboard",
    );
  });

  it("writes and clears selected widget id in search params", () => {
    const params = new URLSearchParams({ entity: "paymentSchedule" });
    const withSelection = applyWidgetSelectionToSearchParams(
      params,
      "income-widget",
    );
    expect(withSelection.get(METRICS_ROW_DESIGNER_WIDGET_SEARCH_PARAM)).toBe(
      "income-widget",
    );
    expect(withSelection.get("entity")).toBe("paymentSchedule");

    const cleared = applyWidgetSelectionToSearchParams(withSelection, "");
    expect(cleared.get(METRICS_ROW_DESIGNER_WIDGET_SEARCH_PARAM)).toBeNull();
    expect(cleared.get("entity")).toBe("paymentSchedule");
  });
});
