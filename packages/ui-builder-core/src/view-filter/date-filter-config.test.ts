import { describe, expect, it } from "vitest";

import {
  defaultDateFilterParam,
  resolveDashboardDateFilterConfig,
  resolveDateFilterParam,
} from "./date-filter-config.js";

describe("date-filter-config", () => {
  it("returns default URL params by granularity", () => {
    expect(defaultDateFilterParam("year")).toBe("year");
    expect(defaultDateFilterParam("month")).toBe("month");
    expect(defaultDateFilterParam("day")).toBe("date");
  });

  it("resolves custom date filter params", () => {
    expect(
      resolveDateFilterParam({
        dateFilterGranularity: "day",
        dateFilterParam: "period",
      }),
    ).toBe("period");
  });

  it("returns config for view-date-filter components", () => {
    expect(
      resolveDashboardDateFilterConfig({
        kind: "view-date-filter",
        dateFilterGranularity: "year",
      }),
    ).toEqual({
      param: "year",
      granularity: "year",
    });
  });
});
