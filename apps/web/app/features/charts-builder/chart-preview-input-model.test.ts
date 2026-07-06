import { describe, expect, it } from "vitest";

import type { ChartDefinitionDraft } from "./chart-definition-draft.js";
import {
  buildChartPreviewRuntime,
  createDefaultPreviewInputValues,
  resolveChartPreviewInputFields,
} from "./chart-preview-input-model.js";

const entityQueryDraft = {
  name: "Income trend chart",
  description: "",
  chartType: "area",
  displayMode: "overlay",
  status: "ACTIVE",
  dataSource: {
    type: "entityQuery",
    entityQueryDefinitionId: "Transaction trend",
    xFieldPath: "date",
    yFieldPath: "amount",
    timeSeries: {
      periodParameter: "period",
      bucketCount: 12,
      step: { unit: "month", offsetStart: -11, offsetEnd: 0 },
      aggregate: "sum",
      rowFilters: [
        {
          whenField: "type",
          whenOperator: "==",
          whenValue: "INCOME",
        },
      ],
    },
  },
} satisfies ChartDefinitionDraft;

const transactionTrendDefinition = {
  id: "entity_query_transaction_trend",
  tenantId: "tenant_1",
  queryId: "transaction_trend",
  name: "Transaction trend",
  sourceEntity: "transaction",
  filter: { type: "group" as const, combinator: "and" as const, children: [] },
  sort: [],
  limitMode: "all" as const,
  status: "ACTIVE" as const,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
  parameters: [
    {
      name: "period",
      valueType: "dateBucket" as const,
      granularity: "month" as const,
      field: "date",
    },
    {
      name: "types",
      valueType: "stringList" as const,
      field: "type",
    },
  ],
} satisfies import("../../lib/api-client.js").EntityQueryDefinitionRecord;

const netBalanceMetricDefinition = {
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
} satisfies import("../../lib/api-client.js").MetricDefinitionRecord;

const netBalanceChartDraft = {
  name: "Total balance trend chart",
  description: "",
  chartType: "area",
  displayMode: "overlay",
  status: "ACTIVE",
  dataSource: {
    type: "metricSeries",
    metricDefinitionId: "Net Balance by Month",
    dimensionField: "period",
    bucketCount: 12,
    step: { unit: "month", offsetStart: -11, offsetEnd: 0 },
    parameterBindings: {
      period: { type: "dashboardDateFilter" },
    },
  },
} satisfies ChartDefinitionDraft;

describe("resolveChartPreviewInputFields", () => {
  it("returns period anchor and stringList inputs for time-series entity queries", () => {
    const fields = resolveChartPreviewInputFields(
      entityQueryDraft,
      transactionTrendDefinition,
    );

    expect(fields).toEqual([
      {
        kind: "dashboardDate",
        key: "dashboardDate",
        granularity: "month",
        param: "period",
        label: "period",
      },
      {
        kind: "stringList",
        key: "types",
        label: "types",
      },
    ]);
  });

  it("uses the computed metric period parameter for metric series preview", () => {
    const fields = resolveChartPreviewInputFields(
      netBalanceChartDraft,
      undefined,
      netBalanceMetricDefinition,
    );

    expect(fields).toEqual([
      {
        kind: "dashboardDate",
        key: "dashboardDate",
        granularity: "month",
        param: "period",
        label: "period",
      },
    ]);
  });
});

describe("buildChartPreviewRuntime", () => {
  it("maps preview inputs into dashboardDateFilter and static parameter bindings", () => {
    const fields = resolveChartPreviewInputFields(
      entityQueryDraft,
      transactionTrendDefinition,
    );
    const values = {
      ...createDefaultPreviewInputValues(fields, entityQueryDraft),
      dashboardDate: "2026-06",
      types: "INCOME, EXPENSE, PAYMENT",
    };

    const runtime = buildChartPreviewRuntime(
      entityQueryDraft,
      {
        kind: "chart",
        chartDefinitionId: "chart_1",
        chartType: "area",
        dataSource: entityQueryDraft.dataSource,
      },
      fields,
      values,
    );

    expect(runtime.context.dashboardDateFilter).toEqual({
      value: "2026-06",
      granularity: "month",
      param: "period",
    });
    expect(runtime.config.dataSource).toMatchObject({
      parameterBindings: {
        types: {
          type: "static",
          value: ["INCOME", "EXPENSE", "PAYMENT"],
        },
      },
    });
  });
});
