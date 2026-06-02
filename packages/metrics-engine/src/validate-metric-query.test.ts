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
  sourceModel: "transaction",
  filters: [],
  groupBy: ["month"],
  dimensions: ["categoryId"],
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
});
