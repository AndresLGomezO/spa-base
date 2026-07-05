import { describe, expect, it } from "vitest";

import type { MetricDefinitionRecord } from "./types.js";
import {
  MetricQueryValidationError,
  validateMetricQueryAgainstDefinition,
} from "./validate-metric-query.js";

const baseDefinition: MetricDefinitionRecord = {
  id: "metric_1",
  tenantId: "tenant_a",
  metricId: "metric_1",
  name: "Test",
  computationMode: "aggregated",
  sourceModel: "transaction",
  filters: [],
  groupBy: ["month"],
  dimensions: ["categoryId"],
  dateFieldGranularity: {},
  valueDisplayFormat: "number",
  parameters: [],
  aggregations: [{ field: "amount", operation: "SUM" }],
  target: { collection: "metric_1", granularity: "dynamic" },
  version: 1,
  schemaVersionDependency: 1,
  fieldsDependency: ["amount"],
  status: "ACTIVE",
  createdAt: "2026-06-01T00:00:00.000Z",
  updatedAt: "2026-06-01T00:00:00.000Z",
};

describe("validateMetricQueryAgainstDefinition", () => {
  it("accepts a fully specified query", () => {
    const result = validateMetricQueryAgainstDefinition(baseDefinition, {
      group: { month: "2026-06" },
      dimensions: { categoryId: "food" },
    });
    expect(result.group).toEqual({ month: "2026-06" });
    expect(result.dimensions).toEqual({ categoryId: "food" });
  });

  it("rejects unknown dimension keys", () => {
    expect(() =>
      validateMetricQueryAgainstDefinition(baseDefinition, {
        group: { month: "2026-06" },
        dimensions: { categoryId: "food", extra: "x" },
      }),
    ).toThrow(MetricQueryValidationError);
  });

  it("rejects missing group fields", () => {
    expect(() =>
      validateMetricQueryAgainstDefinition(baseDefinition, {
        group: {},
        dimensions: { categoryId: "food" },
      }),
    ).toThrow(MetricQueryValidationError);
  });

  it("normalizes date group values using dateFieldGranularity", () => {
    const definition: MetricDefinitionRecord = {
      ...baseDefinition,
      groupBy: ["date"],
      dimensions: [],
      dateFieldGranularity: { date: "month" },
    };

    const result = validateMetricQueryAgainstDefinition(definition, {
      group: { date: "2026-06-02T14:30:00.000Z" },
      dimensions: {},
    });

    expect(result.group).toEqual({ date: "2026-06" });
  });
});
