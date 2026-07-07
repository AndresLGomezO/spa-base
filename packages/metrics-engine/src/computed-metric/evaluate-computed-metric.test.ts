import { describe, expect, it, vi } from "vitest";

import type { MetricDefinitionRecord } from "../types.js";
import {
  evaluateComputedMetric,
  type ComputedMetricInputResolver,
} from "./evaluate-computed-metric.js";

function buildIncomeMetric(): MetricDefinitionRecord {
  return {
    id: "income-id",
    tenantId: "tenant_a",
    metricId: "income-by-month",
    name: "Income by Month",
    computationMode: "aggregated",
    sourceModel: "transaction",
    filters: [],
    groupBy: [],
    dimensions: ["date"],
    dateFieldGranularity: { date: "month" },
    valueDisplayFormat: "currency",
    parameters: [],
    aggregations: [{ operation: "SUM", field: "amount" }],
    schemaVersionDependency: 1,
    fieldsDependency: ["amount", "date"],
    status: "ACTIVE",
    version: 1,
    target: { collection: "metrics/income", granularity: "dynamic" },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

function buildMomMetric(): MetricDefinitionRecord {
  return {
    ...buildIncomeMetric(),
    id: "mom-id",
    metricId: "income-mom",
    name: "Income MoM %",
    computationMode: "computed",
    valueDisplayFormat: "percent",
    parameters: [
      {
        name: "currentPeriod",
        valueType: "dateBucket",
        granularity: "month",
      },
      {
        name: "comparisonPeriod",
        valueType: "dateBucket",
        granularity: "month",
        deriveFrom: {
          parameter: "currentPeriod",
          shift: { unit: "month", offset: -1 },
        },
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
  };
}

function createResolver(
  rowValues: Readonly<Record<string, number>>,
): ComputedMetricInputResolver {
  const income = buildIncomeMetric();

  return {
    resolveMetricDefinition: vi.fn(async (reference: string) => {
      if (reference === "Income by Month") {
        return income;
      }
      return null;
    }),
    readMetricRowValue: vi.fn(async ({ dimensions }) => {
      const period = dimensions.date;
      if (typeof period !== "string") {
        return null;
      }
      return rowValues[period] ?? null;
    }),
    readQueryRefValue: vi.fn(async () => null),
  };
}

describe("evaluateComputedMetric", () => {
  it("evaluates percentChange from metricRef inputs with derived comparison period", async () => {
    const resolver = createResolver({
      "2026-06": 1100,
      "2026-05": 1000,
    });

    const result = await evaluateComputedMetric({
      definition: buildMomMetric(),
      providedParameters: { currentPeriod: "2026-06" },
      userId: "user_123",
      resolver,
    });

    expect(result.values.primary).toBeCloseTo(0.1);
  });

  it("returns empty values when underlying metric rows are missing", async () => {
    const resolver = createResolver({});

    const result = await evaluateComputedMetric({
      definition: buildMomMetric(),
      providedParameters: { currentPeriod: "2026-06" },
      userId: "user_123",
      resolver,
    });

    expect(result.values).toEqual({});
  });

  it("returns empty values when percent change baseline is zero", async () => {
    const resolver = createResolver({
      "2026-06": 1100,
      "2026-05": 0,
    });

    const result = await evaluateComputedMetric({
      definition: buildMomMetric(),
      providedParameters: { currentPeriod: "2026-06" },
      userId: "user_123",
      resolver,
    });

    expect(result.values).toEqual({});
  });

  it("evaluates expression with three-operand subtraction (a - b - c)", async () => {
    const income = buildIncomeMetric();
    const outflows = {
      ...income,
      id: "outflows-id",
      name: "Outflows by Month",
    };
    const invests = { ...income, id: "invests-id", name: "Invested by Month" };

    const totalBalanceMetric: MetricDefinitionRecord = {
      ...buildIncomeMetric(),
      id: "total-balance-id",
      metricId: "total-balance-by-month",
      name: "Total Balance by Month",
      computationMode: "computed",
      parameters: [
        {
          name: "period",
          valueType: "dateBucket",
          granularity: "month",
        },
      ],
      computation: {
        type: "expression",
        inputs: {
          income: {
            type: "metricRef",
            metricDefinitionId: "Income by Month",
            parameterMap: { date: "period" },
          },
          outflows: {
            type: "metricRef",
            metricDefinitionId: "Outflows by Month",
            parameterMap: { date: "period" },
          },
          invests: {
            type: "metricRef",
            metricDefinitionId: "Invested by Month",
            parameterMap: { date: "period" },
          },
        },
        tokens: [
          { type: "input", name: "income" },
          { type: "input", name: "outflows" },
          { type: "operator", op: "-" },
          { type: "input", name: "invests" },
          { type: "operator", op: "-" },
        ],
      },
    };

    const rowValues: Record<string, Record<string, number>> = {
      "Income by Month": { "2026-06": 5000 },
      "Outflows by Month": { "2026-06": 3200 },
      "Invested by Month": { "2026-06": 800 },
    };

    const resolver: ComputedMetricInputResolver = {
      resolveMetricDefinition: vi.fn(async (reference: string) => {
        if (reference === "Income by Month") return income;
        if (reference === "Outflows by Month") return outflows;
        if (reference === "Invested by Month") return invests;
        return null;
      }),
      readMetricRowValue: vi.fn(async ({ definition, dimensions }) => {
        const period = dimensions.date;
        if (typeof period !== "string") return null;
        return rowValues[definition.name]?.[period] ?? null;
      }),
      readQueryRefValue: vi.fn(async () => null),
    };

    const result = await evaluateComputedMetric({
      definition: totalBalanceMetric,
      providedParameters: { period: "2026-06" },
      userId: "user_123",
      resolver,
    });

    expect(result.values.primary).toBe(5000 - 3200 - 800);
  });

  it("treats missing expression inputs as zero when at least one input has data", async () => {
    const income = buildIncomeMetric();
    const outflows = {
      ...income,
      id: "outflows-id",
      name: "Outflows by Month",
    };
    const invests = { ...income, id: "invests-id", name: "Invested by Month" };

    const totalBalanceMetric: MetricDefinitionRecord = {
      ...buildIncomeMetric(),
      id: "total-balance-id",
      metricId: "total-balance-by-month",
      name: "Total Balance by Month",
      computationMode: "computed",
      parameters: [
        {
          name: "period",
          valueType: "dateBucket",
          granularity: "month",
        },
      ],
      computation: {
        type: "expression",
        inputs: {
          income: {
            type: "metricRef",
            metricDefinitionId: "Income by Month",
            parameterMap: { date: "period" },
          },
          outflows: {
            type: "metricRef",
            metricDefinitionId: "Outflows by Month",
            parameterMap: { date: "period" },
          },
          invests: {
            type: "metricRef",
            metricDefinitionId: "Invested by Month",
            parameterMap: { date: "period" },
          },
        },
        tokens: [
          { type: "input", name: "income" },
          { type: "input", name: "outflows" },
          { type: "operator", op: "-" },
          { type: "input", name: "invests" },
          { type: "operator", op: "-" },
        ],
      },
    };

    const rowValues: Record<string, Record<string, number>> = {
      "Income by Month": { "2026-06": 5000 },
      "Outflows by Month": { "2026-06": 3200 },
    };

    const resolver: ComputedMetricInputResolver = {
      resolveMetricDefinition: vi.fn(async (reference: string) => {
        if (reference === "Income by Month") return income;
        if (reference === "Outflows by Month") return outflows;
        if (reference === "Invested by Month") return invests;
        return null;
      }),
      readMetricRowValue: vi.fn(async ({ definition, dimensions }) => {
        const period = dimensions.date;
        if (typeof period !== "string") return null;
        return rowValues[definition.name]?.[period] ?? null;
      }),
      readQueryRefValue: vi.fn(async () => null),
    };

    const result = await evaluateComputedMetric({
      definition: totalBalanceMetric,
      providedParameters: { period: "2026-06" },
      userId: "user_123",
      resolver,
    });

    expect(result.values.primary).toBe(5000 - 3200);
  });

  it("returns empty values when all expression inputs are missing", async () => {
    const income = buildIncomeMetric();
    const outflows = {
      ...income,
      id: "outflows-id",
      name: "Outflows by Month",
    };

    const totalBalanceMetric: MetricDefinitionRecord = {
      ...buildIncomeMetric(),
      id: "total-balance-id",
      metricId: "total-balance-by-month",
      name: "Total Balance by Month",
      computationMode: "computed",
      parameters: [
        {
          name: "period",
          valueType: "dateBucket",
          granularity: "month",
        },
      ],
      computation: {
        type: "expression",
        inputs: {
          income: {
            type: "metricRef",
            metricDefinitionId: "Income by Month",
            parameterMap: { date: "period" },
          },
          outflows: {
            type: "metricRef",
            metricDefinitionId: "Outflows by Month",
            parameterMap: { date: "period" },
          },
        },
        tokens: [
          { type: "input", name: "income" },
          { type: "input", name: "outflows" },
          { type: "operator", op: "-" },
        ],
      },
    };

    const resolver: ComputedMetricInputResolver = {
      resolveMetricDefinition: vi.fn(async (reference: string) => {
        if (reference === "Income by Month") return income;
        if (reference === "Outflows by Month") return outflows;
        return null;
      }),
      readMetricRowValue: vi.fn(async () => null),
      readQueryRefValue: vi.fn(async () => null),
    };

    const result = await evaluateComputedMetric({
      definition: totalBalanceMetric,
      providedParameters: { period: "2026-06" },
      userId: "user_123",
      resolver,
    });

    expect(result.values).toEqual({});
  });
});
