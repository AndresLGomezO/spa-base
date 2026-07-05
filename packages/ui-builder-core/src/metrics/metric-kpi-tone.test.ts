import { describe, expect, it } from "vitest";

import { resolveMetricKpiValueToneClass } from "./metric-kpi-tone.js";

describe("resolveMetricKpiValueToneClass", () => {
  it("returns success for positive values in normal polarity", () => {
    expect(
      resolveMetricKpiValueToneClass(0.12, {
        showToneColors: true,
        tonePolarity: "normal",
      }),
    ).toBe("text-success");
  });

  it("returns danger for negative values in normal polarity", () => {
    expect(
      resolveMetricKpiValueToneClass(-0.08, {
        showToneColors: true,
        tonePolarity: "normal",
      }),
    ).toBe("text-destructive");
  });

  it("inverts polarity for expense-style metrics", () => {
    expect(
      resolveMetricKpiValueToneClass(0.05, {
        showToneColors: true,
        tonePolarity: "inverted",
      }),
    ).toBe("text-destructive");
    expect(
      resolveMetricKpiValueToneClass(-0.05, {
        showToneColors: true,
        tonePolarity: "inverted",
      }),
    ).toBe("text-success");
  });

  it("returns empty when tone colors are disabled or value is neutral", () => {
    expect(resolveMetricKpiValueToneClass(0.1, { showToneColors: false })).toBe(
      "",
    );
    expect(
      resolveMetricKpiValueToneClass(0, {
        showToneColors: true,
        tonePolarity: "normal",
      }),
    ).toBe("");
  });
});
