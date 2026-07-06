import { describe, expect, it } from "vitest";

import { interpolateChartSeriesOffsets } from "./chart-series-step.js";

describe("interpolateChartSeriesOffsets", () => {
  it("returns a single offset when bucket count is 1", () => {
    expect(
      interpolateChartSeriesOffsets(
        { unit: "month", offsetStart: -11, offsetEnd: 0 },
        1,
      ),
    ).toEqual([0]);
  });

  it("interpolates 12 monthly offsets from -11 to 0", () => {
    expect(
      interpolateChartSeriesOffsets(
        { unit: "month", offsetStart: -11, offsetEnd: 0 },
        12,
      ),
    ).toEqual([-11, -10, -9, -8, -7, -6, -5, -4, -3, -2, -1, 0]);
  });
});
