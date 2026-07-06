import { describe, expect, it } from "vitest";

import { resolveChartInsets } from "./chart-layout.js";

describe("resolveChartInsets", () => {
  it("returns zero insets when axes and legend are hidden", () => {
    expect(
      resolveChartInsets(
        { visible: false, position: "none" },
        { visible: false },
        { visible: false },
      ),
    ).toEqual({ top: 0, right: 0, bottom: 0, left: 0 });
  });

  it("reserves bottom space for x axis and bottom legend", () => {
    const insets = resolveChartInsets(
      { visible: true, position: "bottom" },
      { visible: true, showTicks: true, label: "Month" },
      { visible: false },
    );
    expect(insets.bottom).toBeGreaterThan(20);
    expect(insets.top).toBe(0);
  });
});
