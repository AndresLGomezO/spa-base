import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ResolvedChartComponentConfig } from "@repo/ui-builder-core";

type EntityQueryChartDataSource = Extract<
  ResolvedChartComponentConfig["dataSource"],
  { type: "entityQuery" }
>;

import {
  bucketEntityQueryTimeSeriesRows,
  buildEntityQueryRowsFetchKey,
  buildEntityQueryTimeSeriesKey,
  buildMonthToDateChronologicalPoints,
  deriveNetBalanceTypeSets,
  entityQueryTimeSeriesIsConfigured,
  extractDayValuesForMonth,
  fetchEntityQueryRows,
  normalizeChartFieldValue,
  resolveMonthToDateReferenceDay,
} from "./resolve-entity-query-time-series.js";

vi.mock("../../../lib/metric-binding-resolution.js", () => ({
  resolveMetricBindingSource: vi.fn((binding: { offset: number }) => {
    if (binding.offset === -1) {
      return "2026-05";
    }
    if (binding.offset === 0) {
      return "2026-06";
    }
    return String(binding.offset);
  }),
}));

vi.mock("../../../hooks/useEntityQueryDefinitions.js", () => ({
  loadEntityQueryDefinitionsCached: vi.fn(async () => {
    const { listEntityQueryDefinitions } =
      await import("../../../lib/api-client.js");
    return (await listEntityQueryDefinitions()).items;
  }),
}));

vi.mock("../../../lib/api-client.js", () => ({
  listEntityQueryDefinitions: vi.fn(),
}));

vi.mock("../execute-entity-query-definition.js", () => ({
  executeEntityQueryDefinition: vi.fn(),
}));

import { listEntityQueryDefinitions } from "../../../lib/api-client.js";
import { executeEntityQueryDefinition } from "../execute-entity-query-definition.js";

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
} satisfies import("../../../lib/api-client.js").EntityQueryDefinitionRecord;

const sharedParameterBindings = {
  types: {
    type: "static" as const,
    value: ["INCOME", "EXPENSE", "PAYMENT", "INVESTMENT"],
  },
};

const sharedContext = {
  dashboardDateFilter: {
    value: "2026-06",
    granularity: "month" as const,
    param: "period",
  },
};

const mtdContext = {
  dashboardDateFilter: {
    value: "2026-07",
    granularity: "month" as const,
    param: "period",
  },
};

const mtdTimeSeriesBase = {
  periodParameter: "period",
  bucketCount: 30,
  layout: "monthToDateRightAligned" as const,
  step: { unit: "day" as const, offsetStart: 0, offsetEnd: 0 },
  aggregate: "sum" as const,
};

const netBalanceDataSource = {
  type: "entityQuery" as const,
  entityQueryDefinitionId: "Transaction trend",
  xFieldPath: "date",
  yFieldPath: "amount",
  parameterBindings: sharedParameterBindings,
  timeSeries: {
    periodParameter: "period",
    bucketCount: 1,
    step: { unit: "month" as const, offsetStart: 0, offsetEnd: 0 },
    aggregate: "sum" as const,
    rowFilters: [
      {
        whenField: "type",
        whenOperator: "in" as const,
        whenValue: ["INCOME", "EXPENSE", "PAYMENT", "INVESTMENT"],
      },
    ],
    valueTransforms: [
      {
        whenField: "type",
        whenOperator: "in" as const,
        whenValue: ["EXPENSE", "PAYMENT", "INVESTMENT"],
        multiplier: -1,
      },
    ],
  },
};

describe("normalizeChartFieldValue and deriveNetBalanceTypeSets", () => {
  it("unwraps enum-shaped field values", () => {
    expect(normalizeChartFieldValue({ value: "EXPENSE" })).toBe("EXPENSE");
    expect(normalizeChartFieldValue({ code: "PAYMENT" })).toBe("PAYMENT");
  });

  it("derives income and outflow type sets from chart config", () => {
    const sets = deriveNetBalanceTypeSets(
      netBalanceDataSource.timeSeries.rowFilters,
      netBalanceDataSource.timeSeries.valueTransforms,
    );

    expect(sets.typeField).toBe("type");
    expect([...sets.incomeTypes]).toEqual(["INCOME"]);
    expect([...sets.outflowTypes].sort()).toEqual([
      "EXPENSE",
      "INVESTMENT",
      "PAYMENT",
    ]);
    expect(sets.usesMetricParity).toBe(true);
  });

  it("enables metric parity from row filters when value transforms are absent", () => {
    const sets = deriveNetBalanceTypeSets(
      netBalanceDataSource.timeSeries.rowFilters,
      undefined,
    );

    expect(sets.usesMetricParity).toBe(true);
    expect([...sets.incomeTypes]).toEqual(["INCOME"]);
    expect([...sets.outflowTypes].sort()).toEqual([
      "EXPENSE",
      "INVESTMENT",
      "PAYMENT",
    ]);
  });
});

describe("buildEntityQueryRowsFetchKey", () => {
  it("excludes row filters and value transforms from the fetch key", () => {
    const incomeKey = buildEntityQueryRowsFetchKey(
      {
        type: "entityQuery",
        entityQueryDefinitionId: "Transaction trend",
        xFieldPath: "date",
        yFieldPath: "amount",
        parameterBindings: sharedParameterBindings,
        timeSeries: {
          periodParameter: "period",
          bucketCount: 2,
          step: { unit: "month" as const, offsetStart: -1, offsetEnd: 0 },
          aggregate: "sum",
          rowFilters: [
            { whenField: "type", whenOperator: "==", whenValue: "INCOME" },
          ],
        },
      },
      sharedContext,
    );

    const balanceKey = buildEntityQueryRowsFetchKey(
      {
        type: "entityQuery",
        entityQueryDefinitionId: "Transaction trend",
        xFieldPath: "date",
        yFieldPath: "amount",
        parameterBindings: sharedParameterBindings,
        timeSeries: {
          periodParameter: "period",
          bucketCount: 2,
          step: { unit: "month" as const, offsetStart: -1, offsetEnd: 0 },
          aggregate: "sum",
          rowFilters: [
            {
              whenField: "type",
              whenOperator: "in",
              whenValue: ["INCOME", "EXPENSE", "PAYMENT", "INVESTMENT"],
            },
          ],
          valueTransforms: [
            {
              whenField: "type",
              whenOperator: "in",
              whenValue: ["EXPENSE", "PAYMENT", "INVESTMENT"],
              multiplier: -1,
            },
          ],
        },
      },
      sharedContext,
    );

    expect(incomeKey).toBe(balanceKey);
  });
});

describe("buildEntityQueryTimeSeriesKey", () => {
  it("includes row filters for per-chart bucketing cache keys", () => {
    const key = buildEntityQueryTimeSeriesKey(
      {
        type: "entityQuery",
        entityQueryDefinitionId: "Transaction trend",
        xFieldPath: "date",
        yFieldPath: "amount",
        parameterBindings: sharedParameterBindings,
        timeSeries: {
          periodParameter: "period",
          bucketCount: 2,
          step: { unit: "month" as const, offsetStart: -1, offsetEnd: 0 },
          aggregate: "sum",
          rowFilters: [
            { whenField: "type", whenOperator: "==", whenValue: "INCOME" },
          ],
        },
      },
      sharedContext,
    );

    expect(key).toContain("rowFilters");
    expect(key).toContain("INCOME");
  });
});

describe("fetchEntityQueryRows and bucketEntityQueryTimeSeriesRows", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(listEntityQueryDefinitions).mockResolvedValue({
      items: [transactionTrendDefinition],
    });
    vi.mocked(executeEntityQueryDefinition).mockResolvedValue([
      { date: "2026-05-15T00:00:00.000Z", amount: 99, type: "INCOME" },
      { date: "2026-05-20T00:00:00.000Z", amount: 41, type: "EXPENSE" },
      { date: "2026-06-10T00:00:00.000Z", amount: 100, type: "INCOME" },
      { date: "2026-06-12T00:00:00.000Z", amount: 40, type: "EXPENSE" },
      { date: "2026-06-15T00:00:00.000Z", amount: 25, type: "INVESTMENT" },
    ]);
  });

  it("fetches once and buckets income rows with row filters", async () => {
    const dataSource = {
      type: "entityQuery" as const,
      entityQueryDefinitionId: "Transaction trend",
      xFieldPath: "date",
      yFieldPath: "amount",
      parameterBindings: sharedParameterBindings,
      timeSeries: {
        periodParameter: "period",
        bucketCount: 2,
        step: { unit: "month" as const, offsetStart: -1, offsetEnd: 0 },
        aggregate: "sum" as const,
        rowFilters: [
          { whenField: "type", whenOperator: "==", whenValue: "INCOME" },
        ],
      },
    } satisfies EntityQueryChartDataSource;

    const rows = await fetchEntityQueryRows(dataSource, [], sharedContext);
    expect(executeEntityQueryDefinition).toHaveBeenCalledTimes(1);

    const series = bucketEntityQueryTimeSeriesRows(
      rows,
      dataSource,
      sharedContext,
      [{ id: "default", label: "Income", color: "green" }],
    );

    expect(series[0]?.points).toEqual([
      { x: "2026-05", y: 99, seriesId: undefined },
      { x: "2026-06", y: 100, seriesId: undefined },
    ]);
  });

  it("applies row filters and value transforms for total balance buckets", async () => {
    const dataSource = {
      type: "entityQuery" as const,
      entityQueryDefinitionId: "Transaction trend",
      xFieldPath: "date",
      yFieldPath: "amount",
      parameterBindings: sharedParameterBindings,
      timeSeries: {
        periodParameter: "period",
        bucketCount: 2,
        step: { unit: "month" as const, offsetStart: -1, offsetEnd: 0 },
        aggregate: "sum" as const,
        rowFilters: [
          {
            whenField: "type",
            whenOperator: "in",
            whenValue: ["INCOME", "EXPENSE", "PAYMENT", "INVESTMENT"],
          },
        ],
        valueTransforms: [
          {
            whenField: "type",
            whenOperator: "in",
            whenValue: ["EXPENSE", "PAYMENT", "INVESTMENT"],
            multiplier: -1,
          },
        ],
      },
    } satisfies EntityQueryChartDataSource;

    const rows = await fetchEntityQueryRows(dataSource, [], sharedContext);
    const series = bucketEntityQueryTimeSeriesRows(
      rows,
      dataSource,
      sharedContext,
      [{ id: "default", label: "Total Balance", color: "white" }],
    );

    expect(series[0]?.points).toEqual([
      { x: "2026-05", y: 58, seriesId: undefined },
      { x: "2026-06", y: 35, seriesId: undefined },
    ]);
  });

  it("uses metric-equivalent net balance instead of gross sum", () => {
    const rows = [
      { date: "2026-06-10T00:00:00.000Z", amount: 100, type: "INCOME" },
      { date: "2026-06-12T00:00:00.000Z", amount: 40, type: "EXPENSE" },
    ];

    const series = bucketEntityQueryTimeSeriesRows(
      rows,
      {
        ...netBalanceDataSource,
        timeSeries: {
          ...netBalanceDataSource.timeSeries,
          bucketCount: 1,
          step: { unit: "month" as const, offsetStart: 0, offsetEnd: 0 },
        },
      },
      sharedContext,
      [{ id: "default", label: "Net Balance", color: "white" }],
    );

    expect(series[0]?.points).toEqual([
      { x: "2026-06", y: 60, seriesId: undefined },
    ]);
  });

  it("matches total balance metric formula for mixed transaction types including investment", () => {
    const rows = [
      { date: "2026-06-10T00:00:00.000Z", amount: 100, type: "INCOME" },
      { date: "2026-06-11T00:00:00.000Z", amount: 30, type: "EXPENSE" },
      { date: "2026-06-12T00:00:00.000Z", amount: 10, type: "PAYMENT" },
      { date: "2026-06-13T00:00:00.000Z", amount: 25, type: "INVESTMENT" },
    ];

    const expectedTotal = 100 - (30 + 10) - 25;

    const series = bucketEntityQueryTimeSeriesRows(
      rows,
      {
        ...netBalanceDataSource,
        timeSeries: {
          ...netBalanceDataSource.timeSeries,
          bucketCount: 1,
          step: { unit: "month" as const, offsetStart: 0, offsetEnd: 0 },
        },
      },
      sharedContext,
      [{ id: "default", label: "Total Balance", color: "white" }],
    );

    expect(series[0]?.points[0]?.y).toBe(expectedTotal);
  });

  it("subtracts outflows when type is enum-shaped", () => {
    const rows = [
      { date: "2026-06-10T00:00:00.000Z", amount: 100, type: "INCOME" },
      {
        date: "2026-06-12T00:00:00.000Z",
        amount: 40,
        type: { value: "EXPENSE" },
      },
    ];

    const series = bucketEntityQueryTimeSeriesRows(
      rows,
      {
        ...netBalanceDataSource,
        timeSeries: {
          ...netBalanceDataSource.timeSeries,
          bucketCount: 1,
          step: { unit: "month" as const, offsetStart: 0, offsetEnd: 0 },
        },
      },
      sharedContext,
      [{ id: "default", label: "Net Balance", color: "white" }],
    );

    expect(series[0]?.points).toEqual([
      { x: "2026-06", y: 60, seriesId: undefined },
    ]);
  });

  it("uses metric parity when value transforms are missing but row filters imply net balance", () => {
    const rows = [
      { date: "2026-06-10T00:00:00.000Z", amount: 100, type: "INCOME" },
      { date: "2026-06-12T00:00:00.000Z", amount: 40, type: "EXPENSE" },
    ];

    const series = bucketEntityQueryTimeSeriesRows(
      rows,
      {
        ...netBalanceDataSource,
        timeSeries: {
          ...netBalanceDataSource.timeSeries,
          bucketCount: 1,
          step: { unit: "month" as const, offsetStart: 0, offsetEnd: 0 },
          valueTransforms: undefined,
        },
      },
      sharedContext,
      [{ id: "default", label: "Net Balance", color: "white" }],
    );

    expect(series[0]?.points).toEqual([
      { x: "2026-06", y: 60, seriesId: undefined },
    ]);
  });

  it("coerces string multipliers when falling back to value transforms", () => {
    const rows = [
      { date: "2026-06-10T00:00:00.000Z", amount: 100, type: "INCOME" },
      { date: "2026-06-12T00:00:00.000Z", amount: 40, type: "EXPENSE" },
    ];

    const series = bucketEntityQueryTimeSeriesRows(
      rows,
      {
        ...netBalanceDataSource,
        timeSeries: {
          ...netBalanceDataSource.timeSeries,
          bucketCount: 1,
          step: { unit: "month" as const, offsetStart: 0, offsetEnd: 0 },
          valueTransforms: [
            {
              whenField: "type",
              whenOperator: "in",
              whenValue: ["EXPENSE", "PAYMENT"],
              multiplier: "-1" as unknown as number,
            },
          ],
        },
      },
      sharedContext,
      [{ id: "default", label: "Net Balance", color: "white" }],
    );

    expect(series[0]?.points).toEqual([
      { x: "2026-06", y: 60, seriesId: undefined },
    ]);
  });
});

describe("month-to-date chronological layout", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-10T12:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("resolves reference day for current and past filter months", () => {
    expect(resolveMonthToDateReferenceDay(mtdContext)).toBe(10);
    expect(resolveMonthToDateReferenceDay(sharedContext)).toBe(30);
    expect(
      resolveMonthToDateReferenceDay({
        dashboardDateFilter: {
          value: "2026-08",
          granularity: "month",
          param: "period",
        },
      }),
    ).toBe(0);
  });

  it("builds active days 1→N left-to-right with day-number x labels", () => {
    const dayValues = new Map<number, number>([
      [1, 10],
      [5, 50],
      [10, 100],
    ]);

    const points = buildMonthToDateChronologicalPoints(dayValues, 10, 30);

    expect(points).toHaveLength(10);
    expect(points).toEqual([
      { x: "1", y: 10 },
      { x: "2", y: 0 },
      { x: "3", y: 0 },
      { x: "4", y: 0 },
      { x: "5", y: 50 },
      { x: "6", y: 0 },
      { x: "7", y: 0 },
      { x: "8", y: 0 },
      { x: "9", y: 0 },
      { x: "10", y: 100 },
    ]);
  });

  it("returns an empty series when reference day is zero", () => {
    expect(
      buildMonthToDateChronologicalPoints(new Map([[1, 10]]), 0, 30),
    ).toEqual([]);
  });

  it("merges day 31 values into day 30 before slot mapping", () => {
    const dayValues = extractDayValuesForMonth(
      new Map([
        ["2026-07-30", 30],
        ["2026-07-31", 5],
      ]),
      "2026-07",
      31,
    );

    expect(dayValues.get(30)).toBe(35);
  });

  it("buckets income rows into month-to-date daily series", () => {
    const rows = [
      { date: "2026-07-01T00:00:00.000Z", amount: 10, type: "INCOME" },
      { date: "2026-07-10T00:00:00.000Z", amount: 100, type: "INCOME" },
      { date: "2026-07-15T00:00:00.000Z", amount: 999, type: "INCOME" },
    ];

    const series = bucketEntityQueryTimeSeriesRows(
      rows,
      {
        type: "entityQuery",
        entityQueryDefinitionId: "Transaction trend",
        xFieldPath: "date",
        yFieldPath: "amount",
        parameterBindings: sharedParameterBindings,
        timeSeries: {
          ...mtdTimeSeriesBase,
          rowFilters: [
            { whenField: "type", whenOperator: "==", whenValue: "INCOME" },
          ],
        },
      },
      mtdContext,
      [{ id: "default", label: "Income", color: "green" }],
    );

    expect(series[0]?.points).toHaveLength(10);
    expect(series[0]?.points[0]).toEqual({ x: "1", y: 10 });
    expect(series[0]?.points[9]).toEqual({ x: "10", y: 100 });
    expect(series[0]?.points.some((point) => point.y === 999)).toBe(false);
  });

  it("shows full month daily values for a past selected month", () => {
    const rows = [
      { date: "2026-06-01T00:00:00.000Z", amount: 10, type: "INCOME" },
      { date: "2026-06-10T00:00:00.000Z", amount: 100, type: "INCOME" },
    ];

    const series = bucketEntityQueryTimeSeriesRows(
      rows,
      {
        type: "entityQuery",
        entityQueryDefinitionId: "Transaction trend",
        xFieldPath: "date",
        yFieldPath: "amount",
        parameterBindings: sharedParameterBindings,
        timeSeries: {
          ...mtdTimeSeriesBase,
          rowFilters: [
            { whenField: "type", whenOperator: "==", whenValue: "INCOME" },
          ],
        },
      },
      sharedContext,
      [{ id: "default", label: "Income", color: "green" }],
    );

    expect(series[0]?.points).toHaveLength(30);
    expect(series[0]?.points[0]).toEqual({ x: "1", y: 10 });
    expect(series[0]?.points[9]).toEqual({ x: "10", y: 100 });
  });
});

describe("entityQueryTimeSeriesIsConfigured", () => {
  it("requires a query reference when time series is enabled", () => {
    expect(
      entityQueryTimeSeriesIsConfigured({
        type: "entityQuery",
        entityQueryDefinitionId: "Transaction trend",
        xFieldPath: "date",
        yFieldPath: "amount",
        timeSeries: {
          periodParameter: "period",
          bucketCount: 2,
          step: { unit: "month" as const, offsetStart: -1, offsetEnd: 0 },
          aggregate: "sum",
        },
      }),
    ).toBe(true);
  });
});
