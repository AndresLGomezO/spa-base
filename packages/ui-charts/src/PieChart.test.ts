import { describe, expect, it } from "vitest";

import { normalizePieSlices } from "./PieChart.js";

describe("normalizePieSlices", () => {
  it("normalizes absolute values to percentages", () => {
    const result = normalizePieSlices([
      { id: "i", label: "Interés", value: 70 },
      { id: "c", label: "Capital", value: 30 },
    ]);
    expect(result).toHaveLength(2);
    expect(result[0]?.percent).toBe(70);
    expect(result[1]?.percent).toBe(30);
  });

  it("assigns default colors and ids when omitted", () => {
    const result = normalizePieSlices([
      { id: "", label: "A", value: 1 },
      { id: "", label: "B", value: 1 },
    ]);
    expect(result[0]?.id).toBe("slice-0");
    expect(result[1]?.id).toBe("slice-1");
    expect(result[0]?.color).toContain("--color-chart");
  });

  it("returns empty when total is zero or all invalid", () => {
    expect(
      normalizePieSlices([
        { id: "a", label: "X", value: 0 },
        { id: "b", label: "", value: 10 },
      ]),
    ).toEqual([]);
  });
});
