import { describe, expect, it } from "vitest";

import { metricStripHasContent } from "./metric-strip-placement.js";
import { migrateMetricStripToMetricsRow } from "./migrate-metric-strip-to-metrics-row.js";
import type { LegacyTableViewConfig } from "./migrate-metric-strip-to-metrics-row.js";
import type { EntityUIConfig } from "./types.js";

function createBaseUi(): EntityUIConfig {
  return {
    views: [
      {
        type: "table",
        name: "default",
        fields: ["name"],
      },
    ],
    forms: {
      create: {
        layout: {
          root: { type: "root", id: "r", columnCount: 1, columns: [] },
        },
      },
      edit: {
        layout: {
          root: { type: "root", id: "r", columnCount: 1, columns: [] },
        },
      },
    },
  };
}

describe("migrateMetricStripToMetricsRow", () => {
  it("removes metricStripLayout from table views when already on new model", () => {
    const ui: EntityUIConfig = {
      ...createBaseUi(),
      views: [
        {
          type: "table",
          name: "default",
          fields: ["name"],
          metricStripLayout: {
            root: {
              type: "root",
              id: "root-old",
              columnCount: 1,
              columns: [
                {
                  id: "col-old",
                  rows: [
                    {
                      type: "component",
                      id: "row-old",
                      component: {
                        kind: "metric-kpi",
                        metricDefinitionId: "metric_1",
                        groupBindings: {},
                        dimensionBindings: {},
                      },
                    },
                  ],
                },
              ],
            },
          },
        } as LegacyTableViewConfig,
      ],
      metricRowLayout: {
        root: {
          type: "root",
          id: "root-new",
          columnCount: 1,
          columns: [
            {
              id: "col-new",
              rows: [
                {
                  type: "component",
                  id: "row-new",
                  component: {
                    kind: "metric-widget",
                    entityName: "account",
                    widgetId: "widget-existing",
                  },
                },
              ],
            },
          ],
        },
      },
    };

    const migrated = migrateMetricStripToMetricsRow(ui, "account");
    const tableView = migrated.views.find(
      (view): view is LegacyTableViewConfig => view.type === "table",
    );

    expect(tableView?.metricStripLayout).toBeUndefined();
    expect(migrated.metricRowLayout).toEqual(ui.metricRowLayout);
  });

  it("migrates strip columns into widgets and row layout", () => {
    const ui: EntityUIConfig = {
      ...createBaseUi(),
      views: [
        {
          type: "table",
          name: "default",
          fields: ["name"],
          metricStripLayout: {
            root: {
              type: "root",
              id: "root-strip",
              columnCount: 2,
              columns: [
                {
                  id: "col-1",
                  rows: [
                    {
                      type: "component",
                      id: "row-kpi-1",
                      component: {
                        kind: "metric-kpi",
                        metricDefinitionId: "metric_a",
                        groupBindings: {},
                        dimensionBindings: {},
                      },
                    },
                  ],
                },
                {
                  id: "col-2",
                  rows: [
                    {
                      type: "component",
                      id: "row-kpi-2",
                      component: {
                        kind: "metric-kpi",
                        metricDefinitionId: "metric_b",
                        groupBindings: {},
                        dimensionBindings: {},
                      },
                    },
                  ],
                },
              ],
            },
          },
        } as LegacyTableViewConfig,
      ],
    };

    const migrated = migrateMetricStripToMetricsRow(ui, "account");

    expect(migrated.metricWidgets?.length).toBe(2);
    expect(migrated.metricWidgets?.[0]?.name).toBe("Column 1");
    expect(migrated.metricWidgets?.[1]?.name).toBe("Column 2");
    expect(metricStripHasContent(migrated.metricRowLayout)).toBe(true);

    const tableView = migrated.views.find(
      (view): view is LegacyTableViewConfig => view.type === "table",
    );
    expect(tableView?.metricStripLayout).toBeUndefined();
  });
});
