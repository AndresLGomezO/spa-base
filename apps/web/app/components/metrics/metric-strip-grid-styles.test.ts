import { describe, expect, it } from "vitest";

import { createDefaultMetricStripLayout } from "@repo/entities";
import { updateRootColumnStyles } from "@repo/ui-builder-core";

import {
  metricStripColumnWrapperStyle,
  metricStripGridStyle,
} from "./metric-strip-grid-styles.js";

describe("metricStripGridStyle", () => {
  it("applies root strip styles to the grid container", () => {
    const layout = createDefaultMetricStripLayout(2);
    const withRootStyle = {
      ...layout,
      root: {
        ...layout.root,
        styles: [{ property: "backgroundColor" as const, value: "muted" }],
      },
    };

    const grid = metricStripGridStyle(withRootStyle);
    expect(grid.className).toContain("bg-muted");
  });
});

describe("metricStripColumnWrapperStyle", () => {
  it("applies column styles for the placement column index", () => {
    const layout = createDefaultMetricStripLayout(2);
    const styled = updateRootColumnStyles(layout, 0, [
      { property: "padding", value: "24" },
    ]);

    const column1 = metricStripColumnWrapperStyle(styled, 1);
    const column2 = metricStripColumnWrapperStyle(styled, 2);

    expect(column1.style.padding).toBe("24px");
    expect(column2.style.padding).toBeUndefined();
  });
});
