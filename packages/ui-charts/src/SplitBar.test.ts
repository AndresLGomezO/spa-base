import { describe, expect, it } from "vitest";

import { normalizeSplitSegments } from "./SplitBar.js";

describe("normalizeSplitSegments", () => {
  it("normalizes positive segments to percentages", () => {
    const result = normalizeSplitSegments([
      { id: "a", label: "Interés", value: 70 },
      { id: "b", label: "Capital", value: 30 },
    ]);
    expect(result).toHaveLength(2);
    expect(result[0]?.percent).toBe(70);
    expect(result[1]?.percent).toBe(30);
  });

  it("drops non-positive and blank labels", () => {
    const result = normalizeSplitSegments([
      { id: "a", label: "Interés", value: 50 },
      { id: "b", label: "Zero", value: 0 },
      { id: "c", label: "  ", value: 20 },
      { id: "d", label: "Neg", value: -10 },
    ]);
    expect(result).toHaveLength(1);
    expect(result[0]?.label).toBe("Interés");
    expect(result[0]?.percent).toBe(100);
  });

  it("returns empty for all-invalid input", () => {
    expect(
      normalizeSplitSegments([
        { id: "a", label: "X", value: 0 },
        { id: "b", label: "Y", value: Number.NaN },
      ]),
    ).toEqual([]);
  });
});
