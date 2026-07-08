import { describe, expect, it } from "vitest";

import {
  resolveChartGlowFilterId,
  resolveChartGlowStrokeColor,
} from "./chart-glow-filter.js";

describe("chart-glow-filter", () => {
  it("builds glow stroke color with chart fallbacks", () => {
    expect(resolveChartGlowStrokeColor(0, "#6B4EFF")).toBe(
      "var(--color-chart-glow-1, var(--color-chart-1, #6B4EFF))",
    );
    expect(resolveChartGlowStrokeColor(3, "#ef4444")).toBe(
      "var(--color-chart-glow-4, var(--color-chart-4, #ef4444))",
    );
  });

  it("builds stable filter ids per instance and series index", () => {
    expect(resolveChartGlowFilterId("abc", 0)).toBe("chart-glow-abc-0");
    expect(resolveChartGlowFilterId("abc", 2)).toBe("chart-glow-abc-2");
  });
});
