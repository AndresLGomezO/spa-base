import { describe, expect, it } from "vitest";

import type { MetricDefinitionRecord } from "@repo/metrics-engine/browser";

import {
  buildMetricRowQuery,
  chunkMetricQueries,
  formatMetricValueKey,
  MetricQueryBindingsError,
} from "./metric-query-utils.js";

const baseDefinition: MetricDefinitionRecord = {
  id: "def_1",
  tenantId: "tenant_a",
  metricId: "def_1",
  name: "Spend by category",
  sourceModel: "transaction",
  filters: [],
  groupBy: ["month"],
  dimensions: ["categoryId"],
  dateFieldGranularity: {},
  valueDisplayFormat: "number",
  computationMode: "aggregated",
  parameters: [],
  aggregations: [{ field: "amount", operation: "SUM" }],
  target: { collection: "def_1", granularity: "dynamic" },
  version: 1,
  schemaVersionDependency: 1,
  fieldsDependency: ["amount"],
  status: "ACTIVE",
  createdAt: "2026-06-01T00:00:00.000Z",
  updatedAt: "2026-06-01T00:00:00.000Z",
};

describe("buildMetricRowQuery", () => {
  it("builds a query from definition field bindings", () => {
    const query = buildMetricRowQuery(baseDefinition, {
      groupBindings: { month: "2026-06" },
      dimensionBindings: { categoryId: "food" },
    });

    expect(query).toEqual({
      group: { month: "2026-06" },
      dimensions: { categoryId: "food" },
    });
  });

  it("rejects missing group bindings", () => {
    expect(() =>
      buildMetricRowQuery(baseDefinition, {
        groupBindings: {},
        dimensionBindings: { categoryId: "food" },
      }),
    ).toThrow(MetricQueryBindingsError);
  });

  it("rejects unknown dimension bindings", () => {
    expect(() =>
      buildMetricRowQuery(baseDefinition, {
        groupBindings: { month: "2026-06" },
        dimensionBindings: { categoryId: "food", extra: "x" },
      }),
    ).toThrow(MetricQueryBindingsError);
  });
});

describe("chunkMetricQueries", () => {
  it("splits queries into batches of at most maxSize", () => {
    const queries = Array.from({ length: 55 }, (_, index) => ({
      group: { month: `2026-${String(index).padStart(2, "0")}` },
      dimensions: {},
    }));

    const chunks = chunkMetricQueries(queries, 50);
    expect(chunks).toHaveLength(2);
    expect(chunks[0]).toHaveLength(50);
    expect(chunks[1]).toHaveLength(5);
  });
});

describe("formatMetricValueKey", () => {
  it("returns sum key for SUM aggregation", () => {
    expect(formatMetricValueKey("SUM", "amount")).toEqual(["sum_amount"]);
  });
});
