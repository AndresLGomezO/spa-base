import { describe, expect, it } from "vitest";

import type { EntityCatalogEntry } from "../../entities/entity-catalog";
import {
  findMetricWidgetEntityName,
  resolveMetricWidgetTarget,
} from "./resolve-metric-widget-reference";

function createCatalogEntry(
  name: string,
  widgets: Array<{ id: string; name: string }>,
): EntityCatalogEntry {
  return {
    name,
    fields: {},
    ui: {
      views: [{ type: "table", name: "default", fields: ["name"] }],
      metricWidgets: widgets.map((widget) => ({
        id: widget.id,
        name: widget.name,
        layout: {
          showActions: true,
          root: {
            type: "root",
            id: "root-1",
            columnCount: 1,
            columns: [{ id: "col-1", rows: [] }],
          },
        },
      })),
    },
  } as unknown as EntityCatalogEntry;
}

describe("resolveMetricWidgetTarget", () => {
  const catalog = [
    createCatalogEntry("account", [{ id: "widget-1", name: "Total Accounts" }]),
  ];

  it("resolves widget by entityName and widgetId", () => {
    const resolved = resolveMetricWidgetTarget(catalog, {
      kind: "metric-widget",
      entityName: "account",
      widgetId: "widget-1",
    });

    expect(resolved?.widget.name).toBe("Total Accounts");
  });

  it("resolves widget by widgetId when entityName is missing", () => {
    const resolved = resolveMetricWidgetTarget(catalog, {
      kind: "metric-widget",
      entityName: "",
      widgetId: "widget-1",
    });

    expect(resolved?.entityName).toBe("account");
    expect(resolved?.widget.id).toBe("widget-1");
  });

  it("finds the owning entity for a widget id", () => {
    expect(findMetricWidgetEntityName(catalog, "widget-1")).toBe("account");
  });
});
