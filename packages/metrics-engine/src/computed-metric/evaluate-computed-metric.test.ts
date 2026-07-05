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
});
