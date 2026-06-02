import { describe, expect, it } from "vitest";

import type { MetricDefinitionRecord } from "./api-client.js";
import {
  buildMetricRowQueryFromBindings,
  resolveMetricBindingSource,
} from "./metric-binding-resolution.js";

const definition: MetricDefinitionRecord = {
  id: "def_1",
  tenantId: "tenant_a",
  metricId: "def_1",
  name: "Test",
  sourceModel: "transaction",
  filters: [],
  groupBy: ["month"],
  dimensions: ["categoryId"],
  aggregations: [{ field: "amount", operation: "SUM" }],
  target: { collection: "def_1", granularity: "dynamic" },
  version: 1,
  schemaVersionDependency: 1,
  fieldsDependency: ["amount"],
  status: "ACTIVE",
  createdAt: "2026-06-01T00:00:00.000Z",
  updatedAt: "2026-06-01T00:00:00.000Z",
};

describe("resolveMetricBindingSource", () => {
  it("resolves static values", () => {
    expect(
      resolveMetricBindingSource({ type: "static", value: "2026-06" }, {}),
    ).toBe("2026-06");
  });

  it("resolves entity field values from record", () => {
    expect(
      resolveMetricBindingSource(
        { type: "entityField", fieldPath: "categoryId" },
        { record: { categoryId: "food" } },
      ),
    ).toBe("food");
  });

  it("resolves list filter first value", () => {
    expect(
      resolveMetricBindingSource(
        { type: "listFilter", field: "status" },
        { listFilters: { status: ["active", "pending"] } },
      ),
    ).toBe("active");
  });

  it("resolves route params", () => {
    expect(
      resolveMetricBindingSource(
        { type: "routeParam", param: "month" },
        { routeParams: { month: "2026-06" } },
      ),
    ).toBe("2026-06");
  });
});

describe("buildMetricRowQueryFromBindings", () => {
  it("builds a query when bindings resolve", () => {
    const query = buildMetricRowQueryFromBindings(
      definition,
      {
        groupBindings: { month: { type: "static", value: "2026-06" } },
        dimensionBindings: {
          categoryId: { type: "static", value: "food" },
        },
      },
      {},
    );

    expect(query).toEqual({
      group: { month: "2026-06" },
      dimensions: { categoryId: "food" },
    });
  });
});
