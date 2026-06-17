import { describe, expect, it } from "vitest";

import type { MetricDefinitionRecord } from "../../lib/api-client.js";
import {
  evaluateDerivedExpression,
  migrateLegacyDerivedTerms,
  validateDerivedMetricQueryShapes,
} from "./metric-derived-utils.js";

function metricDefinition(
  overrides: Partial<MetricDefinitionRecord> &
    Pick<MetricDefinitionRecord, "name">,
): MetricDefinitionRecord {
  return {
    id: "metric-id",
    tenantId: "tenant-1",
    metricId: "metric-id",
    status: "ACTIVE",
    sourceModel: "transaction",
    filters: [],
    aggregations: [{ operation: "SUM", field: "amount" }],
    groupBy: ["date"],
    dimensions: [],
    dateFieldGranularity: { date: "month" },
    valueDisplayFormat: "currency",
    target: { collection: "metrics", granularity: "month" },
    schemaVersionDependency: 1,
    fieldsDependency: [],
    version: 1,
    createdAt: "",
    updatedAt: "",
    ...overrides,
  };
}

describe("migrateLegacyDerivedTerms", () => {
  it("maps +/-1 two-term weighted sum to subtraction", () => {
    expect(
      migrateLegacyDerivedTerms([
        { metricDefinitionId: "income", multiplier: 1 },
        { metricDefinitionId: "outflows", multiplier: -1 },
      ]),
    ).toEqual([
      { type: "metric", metricDefinitionId: "income" },
      { type: "operator", op: "-" },
      { type: "metric", metricDefinitionId: "outflows" },
    ]);
  });
});

describe("validateDerivedMetricQueryShapes", () => {
  it("returns null when all definitions share the same query shape", () => {
    expect(
      validateDerivedMetricQueryShapes([
        metricDefinition({ id: "income", name: "Income" }),
        metricDefinition({ id: "outflows", name: "Outflows" }),
      ]),
    ).toBeNull();
  });

  it("returns the mismatched metric name", () => {
    expect(
      validateDerivedMetricQueryShapes([
        metricDefinition({ id: "income", name: "Income" }),
        metricDefinition({
          id: "outflows",
          name: "Outflows",
          groupBy: ["accountId"],
        }),
      ]),
    ).toBe("Outflows");
  });
});

describe("evaluateDerivedExpression re-export", () => {
  it("evaluates grouped margin formulas", () => {
    expect(
      evaluateDerivedExpression({
        tokens: [
          { type: "paren", side: "open" },
          { type: "metric", metricDefinitionId: "income" },
          { type: "operator", op: "-" },
          { type: "metric", metricDefinitionId: "outflows" },
          { type: "paren", side: "close" },
          { type: "operator", op: "/" },
          { type: "metric", metricDefinitionId: "income" },
        ],
        resolveMetricValue: (metricDefinitionId) =>
          metricDefinitionId === "income"
            ? 1000
            : metricDefinitionId === "outflows"
              ? 250
              : null,
      }),
    ).toEqual({ value: 0.75 });
  });
});
