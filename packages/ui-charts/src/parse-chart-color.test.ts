import { describe, expect, it } from "vitest";

import {
  parseChartColor,
  resolveAreaFillGradientColor,
  resolveAreaFillGradientOpacity,
} from "./parse-chart-color.js";

describe("parseChartColor", () => {
  it("parses rgba into rgb and opacity", () => {
    expect(parseChartColor("rgba(34, 197, 94, 0.95)")).toEqual({
      rgb: "rgb(34, 197, 94)",
      opacity: 0.95,
    });
  });

  it("parses rgb with full opacity", () => {
    expect(parseChartColor("rgb(255, 255, 255)")).toEqual({
      rgb: "rgb(255, 255, 255)",
      opacity: 1,
    });
  });

  it("returns null for css variables", () => {
    expect(parseChartColor("var(--color-primary)")).toBeNull();
  });
});

describe("resolveAreaFillGradientColor", () => {
  it("normalizes rgba area fill colors", () => {
    expect(
      resolveAreaFillGradientColor(
        "rgba(34, 197, 94, 1)",
        "rgba(34, 197, 94, 0.95)",
      ),
    ).toEqual({
      rgb: "rgb(34, 197, 94)",
      opacity: 1,
    });
  });

  it("falls back to stroke color when fill is unparseable", () => {
    expect(
      resolveAreaFillGradientColor(
        "var(--color-primary)",
        "rgba(99, 102, 241, 0.95)",
      ),
    ).toEqual({
      rgb: "rgb(99, 102, 241)",
      opacity: 0.95,
    });
  });
});

describe("resolveAreaFillGradientOpacity", () => {
  it("multiplies parsed opacity by area fill opacity", () => {
    expect(
      resolveAreaFillGradientOpacity(
        { rgb: "rgb(34, 197, 94)", opacity: 1 },
        0.18,
      ),
    ).toBeCloseTo(0.18);
  });
});
