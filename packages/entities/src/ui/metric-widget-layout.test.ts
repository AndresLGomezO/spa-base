import { isMetricKpiComponent } from "@repo/ui-builder-core";
import { describe, expect, it } from "vitest";

import {
  createDefaultMetricKpiWidgetLayout,
  migrateMetricWidgetLayout,
} from "./metric-widget-layout.js";
import type { ViewMetricKpiWidget } from "./metric-widget-types.js";

describe("metric widget layout", () => {
  it("creates single-column KPI layout with one metric-kpi row", () => {
    const layout = createDefaultMetricKpiWidgetLayout("m1", {
      groupBindings: {},
      dimensionBindings: {},
    });
    expect(layout.root.columnCount).toBe(1);
    const rows = layout.root.columns.flatMap((column) => column.rows);
    expect(rows).toHaveLength(1);
    const kpi = rows[0];
    expect(kpi?.type).toBe("component");
    if (kpi?.type === "component" && isMetricKpiComponent(kpi.component)) {
      expect(kpi.component.metricDefinitionId).toBe("m1");
    }
    const textSlot = rows.find(
      (row) => row.type === "component" && row.component.kind === "text",
    );
    expect(textSlot).toBeUndefined();
  });

  it("stores flat label on metric-kpi component only", () => {
    const layout = createDefaultMetricKpiWidgetLayout(
      "m1",
      { groupBindings: {}, dimensionBindings: {} },
      "Total",
    );
    const row = layout.root.columns[0]?.rows[0];
    expect(row?.type).toBe("component");
    if (row?.type === "component" && row.component.kind === "metric-kpi") {
      expect(row.component.label).toBe("Total");
    }
  });

  it("migrates flat KPI into layout", () => {
    const widget: ViewMetricKpiWidget = {
      id: "w1",
      display: "kpi",
      metricDefinitionId: "m1",
      groupBindings: { region: { type: "static", value: "US" } },
      dimensionBindings: {},
      label: "Total",
    };
    const migrated = migrateMetricWidgetLayout(widget);
    expect(migrated.display).toBe("kpi");
    if (migrated.display === "kpi") {
      expect(migrated.layout).toBeDefined();
    }
  });
});
