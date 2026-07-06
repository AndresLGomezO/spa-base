import { describe, expect, it } from "vitest";

import {
  groupPointsBySeries,
  mapStaticPointsToRenderSeries,
  resolvePreviewChartSeries,
} from "./map-chart-render-series.js";

describe("mapStaticPointsToRenderSeries", () => {
  it("maps static points with series styling", () => {
    const series = mapStaticPointsToRenderSeries(
      [
        { x: "A", y: 1 },
        { x: "B", y: 2 },
      ],
      [{ id: "default", label: "Revenue", color: "red" }],
    );

    expect(series).toEqual([
      expect.objectContaining({
        id: "default",
        label: "Revenue",
        color: "red",
        points: [
          { x: "A", y: 1, seriesId: undefined },
          { x: "B", y: 2, seriesId: undefined },
        ],
      }),
    ]);
  });
});

describe("resolvePreviewChartSeries", () => {
  it("applies widget series colors to preview points", () => {
    const series = resolvePreviewChartSeries([
      { id: "default", label: "Income", color: "rgba(34, 197, 94, 0.95)" },
    ]);

    expect(series[0]?.color).toBe("rgba(34, 197, 94, 0.95)");
    expect(series[0]?.points).toHaveLength(6);
  });
});

describe("groupPointsBySeries", () => {
  it("groups multi-series static points", () => {
    const series = groupPointsBySeries(
      [
        { x: "A", y: 1, seriesId: "one" },
        { x: "A", y: 3, seriesId: "two" },
      ],
      [
        { id: "one", label: "One" },
        { id: "two", label: "Two" },
      ],
    );

    expect(series).toHaveLength(2);
    expect(series[0]?.label).toBe("One");
    expect(series[1]?.label).toBe("Two");
  });
});
