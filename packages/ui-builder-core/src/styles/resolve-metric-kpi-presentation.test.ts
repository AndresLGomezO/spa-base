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
});
