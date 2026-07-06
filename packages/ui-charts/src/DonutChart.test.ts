import { describe, expect, it } from "vitest";

import { buildDonutSlices } from "./DonutChart.js";

describe("buildDonutSlices", () => {
  it("splits value and remainder for 50%", () => {
    expect(buildDonutSlices(50, 100, "#0f0", "#eee")).toEqual([
      { id: "value", value: 50, color: "#0f0" },
      { id: "remainder", value: 50, color: "#eee" },
    ]);
  });

  it("returns full track when value is 0", () => {
    expect(buildDonutSlices(0, 100, "#0f0", "#eee")).toEqual([
      { id: "value", value: 0, color: "#0f0" },
      { id: "remainder", value: 100, color: "#eee" },
    ]);
  });

  it("returns full fill when value reaches max", () => {
    expect(buildDonutSlices(100, 100, "#0f0", "#eee")).toEqual([
      { id: "value", value: 100, color: "#0f0" },
      { id: "remainder", value: 0, color: "#eee" },
    ]);
  });

  it("clamps values above maxValue", () => {
    expect(buildDonutSlices(150, 100, "#0f0", "#eee")).toEqual([
      { id: "value", value: 100, color: "#0f0" },
      { id: "remainder", value: 0, color: "#eee" },
    ]);
  });

  it("clamps negative values to zero", () => {
    expect(buildDonutSlices(-10, 100, "#0f0", "#eee")).toEqual([
      { id: "value", value: 0, color: "#0f0" },
      { id: "remainder", value: 100, color: "#eee" },
    ]);
  });

  it("falls back to 100 when maxValue is invalid", () => {
    expect(buildDonutSlices(25, 0, "#0f0", "#eee")).toEqual([
      { id: "value", value: 25, color: "#0f0" },
      { id: "remainder", value: 75, color: "#eee" },
    ]);
  });
});
