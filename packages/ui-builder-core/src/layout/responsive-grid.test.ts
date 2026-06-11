import { describe, expect, it } from "vitest";

import type { ColumnNode } from "../types/layout.js";
import {
  buildAutoFitGridTemplate,
  buildProportionalGridColsClass,
  buildProportionalResponsiveGridClassName,
  buildResponsiveGridClassName,
  buildResponsiveGridClassNameAtBreakpoint,
  PROPORTIONAL_GRID_TEMPLATE_CLASS,
  resolveResponsiveGridCounts,
  resolveResponsiveGridLayout,
} from "./responsive-grid.js";

function column(id: string, widthPercent?: number): ColumnNode {
  return {
    id,
    rows: [],
    ...(widthPercent !== undefined ? { widthPercent } : {}),
  };
}

describe("resolveResponsiveGridLayout", () => {
  it("uses fixed mode for single column layouts", () => {
    expect(
      resolveResponsiveGridLayout({
        styles: undefined,
        columnCount: 1,
        slotCount: 1,
      }),
    ).toEqual({ mode: "fixed" });
  });

  it("auto-defaults 2 columns to stack on mobile and 2 cols from sm", () => {
    const resolved = resolveResponsiveGridLayout({
      styles: undefined,
      columnCount: 2,
      slotCount: 2,
    });
    expect(resolved.mode).toBe("responsive");
    expect(resolved.className).toBe("grid-cols-1 sm:grid-cols-2");
  });

  it("auto-defaults 3 columns progressively", () => {
    const resolved = resolveResponsiveGridLayout({
      styles: undefined,
      columnCount: 3,
      slotCount: 3,
    });
    expect(resolved.className).toBe(
      "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
    );
  });

  it("honors explicit breakpoint overrides", () => {
    const resolved = resolveResponsiveGridLayout({
      styles: [{ property: "gridColumnsMd", value: "2" }],
      columnCount: 2,
      slotCount: 2,
    });
    expect(resolved.mode).toBe("responsive");
    expect(resolved.className).toBe("grid-cols-1 sm:grid-cols-2");
  });

  it("keeps full column count when a column slot is empty", () => {
    const counts = resolveResponsiveGridCounts(undefined, 2);
    expect(counts).toEqual({
      base: 1,
      sm: 2,
      md: 2,
      lg: 2,
      xl: 2,
    });
  });

  it("preserves legacy fixed grid when gridResponsiveMode is fixed", () => {
    expect(
      resolveResponsiveGridLayout({
        styles: [{ property: "gridResponsiveMode", value: "fixed" }],
        columnCount: 2,
        slotCount: 2,
      }),
    ).toEqual({ mode: "fixed" });
  });

  it("uses auto-fit template when gridAutoFitMinWidth is set", () => {
    expect(
      resolveResponsiveGridLayout({
        styles: [{ property: "gridAutoFitMinWidth", value: "280" }],
        columnCount: 2,
        slotCount: 2,
      }),
    ).toEqual({
      mode: "autoFit",
      columnsTemplate: "repeat(auto-fit, minmax(min(100%, 280px), 1fr))",
    });
  });

  it("uses proportional responsive classes when widthPercent is set", () => {
    const resolved = resolveResponsiveGridLayout({
      styles: undefined,
      columnCount: 2,
      slotCount: 2,
      columns: [column("a", 70), column("b", 30)],
    });

    expect(resolved.mode).toBe("responsive");
    expect(resolved.className).toBe(
      `grid-cols-1 sm:${PROPORTIONAL_GRID_TEMPLATE_CLASS} md:${PROPORTIONAL_GRID_TEMPLATE_CLASS} lg:${PROPORTIONAL_GRID_TEMPLATE_CLASS} xl:${PROPORTIONAL_GRID_TEMPLATE_CLASS}`,
    );
    expect(resolved.proportionalColumnsTemplate).toBe(
      "minmax(0, 70fr) minmax(0, 30fr)",
    );
  });

  it("uses fixed proportional template at preview breakpoint when multi-column", () => {
    const resolved = resolveResponsiveGridLayout({
      styles: undefined,
      columnCount: 2,
      slotCount: 2,
      columns: [column("a", 70), column("b", 30)],
      atBreakpoint: "sm",
    });

    expect(resolved).toEqual({
      mode: "fixed",
      columnsTemplate: "minmax(0, 70fr) minmax(0, 30fr)",
    });
  });

  it("stacks at preview breakpoint base even with widthPercent", () => {
    const resolved = resolveResponsiveGridLayout({
      styles: undefined,
      columnCount: 2,
      slotCount: 2,
      columns: [column("a", 70), column("b", 30)],
      atBreakpoint: "base",
    });

    expect(resolved.mode).toBe("responsive");
    expect(resolved.className).toBe("grid-cols-1");
  });
});

describe("buildAutoFitGridTemplate", () => {
  it("builds auto-fit minmax template", () => {
    expect(buildAutoFitGridTemplate(320)).toBe(
      "repeat(auto-fit, minmax(min(100%, 320px), 1fr))",
    );
  });
});

describe("buildResponsiveGridClassName", () => {
  it("deduplicates consecutive identical breakpoint classes", () => {
    expect(
      buildResponsiveGridClassName({
        base: 1,
        sm: 2,
        md: 2,
        lg: 2,
        xl: 2,
      }),
    ).toBe("grid-cols-1 sm:grid-cols-2");
  });
});

describe("buildProportionalResponsiveGridClassName", () => {
  it("stacks on mobile and applies proportional template from sm", () => {
    expect(
      buildProportionalResponsiveGridClassName(
        {
          base: 1,
          sm: 2,
          md: 2,
          lg: 2,
          xl: 2,
        },
        2,
      ),
    ).toBe(
      `grid-cols-1 sm:${PROPORTIONAL_GRID_TEMPLATE_CLASS} md:${PROPORTIONAL_GRID_TEMPLATE_CLASS} lg:${PROPORTIONAL_GRID_TEMPLATE_CLASS} xl:${PROPORTIONAL_GRID_TEMPLATE_CLASS}`,
    );
  });

  it("falls back to equal columns when breakpoint count differs from columnCount", () => {
    expect(
      buildProportionalResponsiveGridClassName(
        {
          base: 1,
          sm: 2,
          md: 2,
          lg: 3,
          xl: 3,
        },
        3,
      ),
    ).toBe(
      `grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:${PROPORTIONAL_GRID_TEMPLATE_CLASS} xl:${PROPORTIONAL_GRID_TEMPLATE_CLASS}`,
    );
  });
});

describe("buildProportionalGridColsClass", () => {
  it("builds breakpoint-prefixed proportional template class", () => {
    expect(buildProportionalGridColsClass("md:")).toBe(
      `md:${PROPORTIONAL_GRID_TEMPLATE_CLASS}`,
    );
  });
});

describe("buildResponsiveGridClassNameAtBreakpoint", () => {
  it("returns a single grid-cols class for the selected breakpoint", () => {
    const counts = {
      base: 1,
      sm: 2,
      md: 2,
      lg: 3,
      xl: 3,
    };
    expect(buildResponsiveGridClassNameAtBreakpoint(counts, "base")).toBe(
      "grid-cols-1",
    );
    expect(buildResponsiveGridClassNameAtBreakpoint(counts, "lg")).toBe(
      "grid-cols-3",
    );
  });
});

describe("resolveResponsiveGridLayout atBreakpoint", () => {
  it("forces a single grid class when atBreakpoint is set", () => {
    const resolved = resolveResponsiveGridLayout({
      styles: undefined,
      columnCount: 3,
      slotCount: 3,
      atBreakpoint: "base",
    });
    expect(resolved.mode).toBe("responsive");
    expect(resolved.className).toBe("grid-cols-1");

    const atLg = resolveResponsiveGridLayout({
      styles: undefined,
      columnCount: 3,
      slotCount: 3,
      atBreakpoint: "lg",
    });
    expect(atLg.className).toBe("grid-cols-3");
  });
});
