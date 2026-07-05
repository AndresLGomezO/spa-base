import { describe, expect, it } from "vitest";

import type { MetricDefinitionRecord } from "../../lib/api-client";
import { DEFAULT_METRIC_LIST_SORT } from "./metric-list-styles";
import {
  buildMetricsListQueryState,
  filterMetricDefinitions,
  sortMetricDefinitions,
} from "./use-metrics-list-query";

const definitions: readonly MetricDefinitionRecord[] = [
  {
    id: "m1",
    tenantId: "t",
    metricId: "income",
    name: "Income by Month",
    sourceModel: "transaction",
    filters: [],
    groupBy: [],
    dimensions: ["date"],
    dateFieldGranularity: { date: "month" },
    valueDisplayFormat: "currency",
    computationMode: "aggregated",
    parameters: [],
    aggregations: [{ operation: "SUM", field: "amount" }],
    target: { collection: "m1", granularity: "dynamic" },
    version: 1,
    schemaVersionDependency: 0,
    fieldsDependency: ["amount"],
    status: "ACTIVE",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-06-01T00:00:00.000Z",
  },
  {
    id: "m2",
    tenantId: "t",
    metricId: "income_mom",
    name: "Income MoM %",
    sourceModel: "transaction",
    filters: [],
    groupBy: [],
    dimensions: [],
    dateFieldGranularity: {},
    valueDisplayFormat: "percent",
    computationMode: "computed",
    parameters: [
      {
        name: "currentPeriod",
        valueType: "dateBucket",
        granularity: "month",
      },
    ],
    computation: {
      type: "percentChange",
      current: {
        type: "metricRef",
        metricDefinitionId: "Income by Month",
        parameterMap: { date: "currentPeriod" },
      },
      baseline: {
        type: "metricRef",
        metricDefinitionId: "Income by Month",
        parameterMap: { date: "comparisonPeriod" },
      },
    },
    aggregations: [{ operation: "COUNT" }],
    target: { collection: "m2", granularity: "dynamic" },
    version: 1,
    schemaVersionDependency: 0,
    fieldsDependency: [],
    status: "ACTIVE",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-05-01T00:00:00.000Z",
  },
];

describe("metrics list query helpers", () => {
  it("filters by computed mode and search", () => {
    const filtered = filterMetricDefinitions(definitions, {
      search: "mom",
      sourceTypes: [],
      modes: ["computed"],
      statuses: [],
      entities: [],
      sort: DEFAULT_METRIC_LIST_SORT,
    });

    expect(filtered).toHaveLength(1);
    expect(filtered[0]?.name).toBe("Income MoM %");
  });

  it("sorts by name descending", () => {
    const sorted = sortMetricDefinitions(definitions, "nameDesc");
    expect(sorted.map((item) => item.name)).toEqual([
      "Income MoM %",
      "Income by Month",
    ]);
  });

  it("parses URL search params", () => {
    const params = new URLSearchParams({
      q: "income",
      mode: "computed",
      sort: "nameAsc",
    });
    const query = buildMetricsListQueryState(params);
    expect(query.search).toBe("income");
    expect(query.modes).toEqual(["computed"]);
    expect(query.sort).toBe("nameAsc");
  });
});
