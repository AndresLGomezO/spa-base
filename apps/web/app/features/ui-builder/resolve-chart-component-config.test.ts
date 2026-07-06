import { describe, expect, it } from "vitest";

import { resolveChartComponentConfig } from "./resolve-chart-component-config.js";
import type { ChartDefinitionRecord } from "../../lib/api-client.js";

const definition: ChartDefinitionRecord = {
  id: "chart_doc_1",
  tenantId: "tenant_a",
  chartId: "income_trend_chart",
  name: "Income trend chart",
  chartType: "area",
  displayMode: "overlay",
  dataSource: {
    type: "entityQuery",
    entityQueryDefinitionId: "Transaction trend",
    xFieldPath: "date",
    yFieldPath: "amount",
    parameterBindings: {
      types: { type: "static", value: ["INCOME"] },
    },
  },
  series: [{ id: "default", label: "Income" }],
  status: "ACTIVE",
  version: 1,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

describe("resolve-chart-component-config", () => {
  it("merges instance parameter bindings over definition defaults", () => {
    const resolved = resolveChartComponentConfig(
      {
        kind: "chart",
        chartDefinitionId: "Income trend chart",
        parameterBindings: {
          types: {
            type: "static",
            value: ["INCOME", "EXPENSE", "PAYMENT", "INVESTMENT"],
          },
        },
        styles: [{ property: "width", value: "100%" }],
      },
      definition,
    );

    expect(resolved.dataSource.type).toBe("entityQuery");
    if (resolved.dataSource.type === "entityQuery") {
      expect(resolved.dataSource.parameterBindings?.types).toEqual({
        type: "static",
        value: ["INCOME", "EXPENSE", "PAYMENT", "INVESTMENT"],
      });
    }
    expect(resolved.styles).toEqual([{ property: "width", value: "100%" }]);
    expect(resolved.chartType).toBe("area");
  });
});
