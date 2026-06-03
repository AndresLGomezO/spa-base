import { describe, expect, it } from "vitest";

import {
  clampMetricWidgetsToStrip,
  createDefaultMetricStripLayout,
  defaultPlacementForNewWidget,
  migrateMetricWidgetsWithPlacement,
  resolveWidgetPlacement,
} from "./metric-strip-placement.js";
import type { ViewMetricKpiWidget } from "./metric-widget-types.js";

function kpi(
  id: string,
  placement?: ViewMetricKpiWidget["placement"],
): ViewMetricKpiWidget {
  return {
    id,
    display: "kpi",
    metricDefinitionId: "m1",
    groupBindings: {},
    dimensionBindings: {},
    placement,
  };
}

describe("metric strip placement", () => {
  it("creates empty shell layout with column count", () => {
    const layout = createDefaultMetricStripLayout(3);
    expect(layout.root.columnCount).toBe(3);
    expect(layout.root.columns).toHaveLength(3);
    expect(layout.root.columns.every((col) => col.rows.length === 0)).toBe(
      true,
    );
  });

  it("migrates missing placement from index", () => {
    const widgets = migrateMetricWidgetsWithPlacement(
      [kpi("a"), kpi("b"), kpi("c"), kpi("d"), kpi("e")],
      4,
    );
    expect(widgets[0]?.placement).toEqual({
      column: 1,
      row: 1,
      columnSpan: 1,
      rowSpan: 1,
    });
    expect(widgets[4]?.placement).toEqual({
      column: 1,
      row: 2,
      columnSpan: 1,
      rowSpan: 1,
    });
  });

  it("clamps column span when strip shrinks", () => {
    const widgets = clampMetricWidgetsToStrip(
      [kpi("a", { column: 3, columnSpan: 4, row: 1 })],
      2,
    );
    expect(widgets[0]?.placement).toEqual({
      column: 2,
      columnSpan: 1,
      row: 1,
    });
  });

  it("assigns next row in column 1 for new widgets", () => {
    const widgets = [
      kpi("a", { column: 1, row: 1 }),
      kpi("b", { column: 1, row: 2 }),
    ];
    expect(defaultPlacementForNewWidget(widgets, 4)).toEqual({
      column: 1,
      row: 3,
      columnSpan: 1,
      rowSpan: 1,
    });
  });

  it("resolveWidgetPlacement uses explicit placement", () => {
    const widget = kpi("a", { column: 2, row: 3, columnSpan: 2 });
    expect(resolveWidgetPlacement(widget, 0, 4)).toMatchObject({
      column: 2,
      row: 3,
      columnSpan: 2,
    });
  });
});
