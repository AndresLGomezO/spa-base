import { describe, expect, it } from "vitest";

import {
  buildChartsListQueryState,
  filterChartDefinitions,
  sortChartDefinitions,
} from "./use-charts-list-query.js";
import type { ChartDefinitionRecord } from "../../lib/api-client.js";

const definitions: ChartDefinitionRecord[] = [
  {
    id: "chart_b",
    tenantId: "tenant_a",
    chartId: "expenses_trend_chart",
    name: "Expenses trend chart",
    chartType: "area",
    displayMode: "overlay",
    dataSource: {
      type: "entityQuery",
      entityQueryDefinitionId: "q1",
      xFieldPath: "date",
      yFieldPath: "amount",
    },
    status: "ACTIVE",
    version: 1,
    createdAt: "2026-01-02T00:00:00.000Z",
    updatedAt: "2026-01-02T00:00:00.000Z",
  },
  {
    id: "chart_a",
    tenantId: "tenant_a",
    chartId: "income_trend_chart",
    name: "Income trend chart",
    chartType: "line",
    dataSource: { type: "static", points: [] },
    status: "PAUSED",
    version: 1,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
];

describe("use-charts-list-query helpers", () => {
  it("filters by search, status, and data source", () => {
    const query = buildChartsListQueryState(
      new URLSearchParams("q=income&status=PAUSED&dataSource=static"),
    );
    const filtered = filterChartDefinitions(definitions, query);
    expect(filtered.map((item) => item.id)).toEqual(["chart_a"]);
  });

  it("sorts by updated date descending", () => {
    const sorted = sortChartDefinitions(definitions, "updatedDesc");
    expect(sorted.map((item) => item.id)).toEqual(["chart_b", "chart_a"]);
  });
});
