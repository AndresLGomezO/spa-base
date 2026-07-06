import { describe, expect, it, vi } from "vitest";

import { buildMetricSeriesChartQueries } from "./build-metric-series-chart-queries.js";

vi.mock("../../../lib/metric-binding-resolution.js", async (importOriginal) => {
  const actual =
    await importOriginal<
      typeof import("../../../lib/metric-binding-resolution.js")
    >();
  return {
    ...actual,
    resolveMetricBindingSource: vi.fn((binding: { offset: number }) => {
      if (binding.offset === -1) {
        return "2026-05";
      }
      if (binding.offset === 0) {
        return "2026-06";
      }
      return String(binding.offset);
    }),
  };
});

const netBalanceDefinition = {
  id: "metric_net_balance",
  tenantId: "tenant_1",
  metricId: "net_balance_by_month",
  name: "Net Balance by Month",
  computationMode: "computed" as const,
  sourceModel: "transaction",
  parameters: [
    {
      name: "period",
      valueType: "dateBucket" as const,
      granularity: "month" as const,
    },
  ],
  filters: [],
  groupBy: [],
  dimensions: [],
  dateFieldGranularity: {},
  valueDisplayFormat: "currency" as const,
  aggregations: [{ operation: "COUNT" as const }],
  target: { collection: "metric_net_balance", granularity: "dynamic" as const },
  version: 1,
  schemaVersionDependency: 0,
  fieldsDependency: [],
  status: "ACTIVE" as const,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
} satisfies import("../../../lib/api-client.js").MetricDefinitionRecord;

const incomeByMonthDefinition = {
  id: "metric_income_by_month",
  tenantId: "tenant_1",
  metricId: "income_by_month",
  name: "Income by Month",
  sourceModel: "transaction",
  filters: [{ field: "type", op: "eq" as const, value: "INCOME" }],
  groupBy: [],
  dimensions: ["date"],
  dateFieldGranularity: { date: "month" as const },
  valueDisplayFormat: "currency" as const,
  aggregations: [{ operation: "SUM" as const, field: "amount" }],
  target: {
    collection: "metric_income_by_month",
    granularity: "dynamic" as const,
  },
  version: 1,
  schemaVersionDependency: 0,
  fieldsDependency: ["amount", "type", "date"],
  status: "ACTIVE" as const,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
} satisfies import("../../../lib/api-client.js").MetricDefinitionRecord;

const sharedContext = {
  dashboardDateFilter: {
    value: "2026-06",
    granularity: "month" as const,
    param: "period",
  },
};

describe("buildMetricSeriesChartQueries", () => {
  it("builds computed evaluate parameters with month bucket labels", () => {
    const buckets = buildMetricSeriesChartQueries(
      netBalanceDefinition,
      {
        type: "metricSeries",
        metricDefinitionId: "Net Balance by Month",
        dimensionField: "period",
        bucketCount: 2,
        step: { unit: "month", offsetStart: -1, offsetEnd: 0 },
        parameterBindings: {
          period: { type: "dashboardDateFilter" },
        },
      },
      sharedContext,
    );

    expect(buckets).toEqual([
      {
        mode: "computed",
        parameters: { period: "2026-05" },
        label: "2026-05",
      },
      {
        mode: "computed",
        parameters: { period: "2026-06" },
        label: "2026-06",
      },
    ]);
  });

  it("builds aggregated batch queries with month bucket labels", () => {
    const buckets = buildMetricSeriesChartQueries(
      incomeByMonthDefinition,
      {
        type: "metricSeries",
        metricDefinitionId: "Income by Month",
        dimensionField: "date",
        bucketCount: 2,
        step: { unit: "month", offsetStart: -1, offsetEnd: 0 },
      },
      {},
    );

    expect(buckets).toHaveLength(2);
    expect(buckets[0]).toMatchObject({
      mode: "aggregated",
      label: "2026-05",
    });
    expect(buckets[1]).toMatchObject({
      mode: "aggregated",
      label: "2026-06",
    });
  });
});
