import { describe, expect, it } from "vitest";

import { resolveMetricKpiPresentation } from "./resolve-metric-kpi-presentation.js";

describe("resolveMetricKpiPresentation", () => {
  it("splits container and text styles for metric-kpi slots", () => {
    const presentation = resolveMetricKpiPresentation([
      { property: "color", value: "primary" },
      { property: "fontSize", value: "28" },
      { property: "padding", value: "8" },
    ]);

    expect(presentation.className).not.toContain("text-primary");
    expect(presentation.valueClassName).toBe("truncate text-primary");
    expect(presentation.textSize).toBe(28);
    expect(presentation.style.padding).toBe("8px");
  });

  it("applies custom text colors via valueStyle", () => {
    const presentation = resolveMetricKpiPresentation([
      { property: "color", value: "#ff0000" },
    ]);

    expect(presentation.valueStyle?.color).toBe("#ff0000");
  });

  it("keeps hoisted margins on the row wrapper only", () => {
    const presentation = resolveMetricKpiPresentation([
      { property: "marginTop", value: "12" },
      { property: "padding", value: "8" },
    ]);

    expect(presentation.style.marginTop).toBeUndefined();
    expect(presentation.style.padding).toBe("8px");
  });

  it("exposes responsive fontSize cssText and CSS var valueStyle", () => {
    const presentation = resolveMetricKpiPresentation([
      {
        property: "fontSize",
        value: "20",
        valuesByBreakpoint: { md: "10" },
      },
    ]);

    expect(presentation.textSize).toBeUndefined();
    expect(presentation.valueStyle?.fontSize).toBe("var(--ub-font-size)");
    expect(presentation.cssText).toContain("--ub-font-size:10px");
    expect(presentation.cssText).toContain("--ub-font-size:20px");
    expect(presentation.className).toMatch(/ub-rs-/);
  });
});
