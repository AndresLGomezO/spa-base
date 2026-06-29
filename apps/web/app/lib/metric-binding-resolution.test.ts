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
  dateFieldGranularity: {},
  valueDisplayFormat: "number",
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

  it("treats empty static values as unresolved", () => {
    expect(resolveMetricBindingSource({ type: "static", value: "" }, {})).toBe(
      null,
    );
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

const totalDefinition: MetricDefinitionRecord = {
  ...definition,
  groupBy: [],
  dimensions: [],
};

describe("buildMetricRowQueryFromBindings", () => {
  it("builds an empty query for totals without bindings", () => {
    const query = buildMetricRowQueryFromBindings(
      totalDefinition,
      {
        groupBindings: { amount: { type: "static", value: "ignored" } },
        dimensionBindings: {},
      },
      {},
    );

    expect(query).toEqual({
      group: {},
      dimensions: {},
    });
  });

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

  it("returns null while a date bucket binding is incomplete", () => {
    const dateDefinition: MetricDefinitionRecord = {
      ...definition,
      groupBy: ["date"],
      dimensions: [],
      dateFieldGranularity: { date: "month" },
    };

    expect(
      buildMetricRowQueryFromBindings(
        dateDefinition,
        {
          groupBindings: { date: { type: "static", value: "2026-0" } },
          dimensionBindings: {},
        },
        {},
      ),
    ).toBeNull();
  });

  it("returns null for empty static bindings", () => {
    const dateDefinition: MetricDefinitionRecord = {
      ...definition,
      groupBy: ["date"],
      dimensions: [],
      dateFieldGranularity: { date: "month" },
    };

    expect(
      buildMetricRowQueryFromBindings(
        dateDefinition,
        {
          groupBindings: { date: { type: "static", value: "" } },
          dimensionBindings: {},
        },
        {},
      ),
    ).toBeNull();
  });

  it("overrides month-granularity fields with dashboardDateFilter", () => {
    const dateDefinition: MetricDefinitionRecord = {
      ...definition,
      groupBy: ["periodStart"],
      dimensions: ["categoryId"],
      dateFieldGranularity: { periodStart: "month" },
    };

    const query = buildMetricRowQueryFromBindings(
      dateDefinition,
      {
        groupBindings: { periodStart: { type: "static", value: "2025-01" } },
        dimensionBindings: {
          categoryId: { type: "static", value: "food" },
        },
      },
      {
        dashboardDateFilter: {
          value: "2026-06",
          granularity: "month",
          param: "month",
        },
      },
    );

    expect(query).toEqual({
      group: { periodStart: "2026-06" },
      dimensions: { categoryId: "food" },
    });
  });

  it("overrides year-granularity fields with dashboardDateFilter", () => {
    const dateDefinition: MetricDefinitionRecord = {
      ...definition,
      groupBy: ["periodStart"],
      dimensions: [],
      dateFieldGranularity: { periodStart: "year" },
    };

    const query = buildMetricRowQueryFromBindings(
      dateDefinition,
      {
        groupBindings: { periodStart: { type: "static", value: "2025" } },
        dimensionBindings: {},
      },
      {
        dashboardDateFilter: {
          value: "2026",
          granularity: "year",
          param: "year",
        },
      },
    );

    expect(query).toEqual({
      group: { periodStart: "2026" },
      dimensions: {},
    });
  });

  it("leaves non-matching granularity fields untouched when dashboardDateFilter is set", () => {
    const dateDefinition: MetricDefinitionRecord = {
      ...definition,
      groupBy: ["periodStart"],
      dimensions: ["categoryId"],
      dateFieldGranularity: { periodStart: "month" },
    };

    const query = buildMetricRowQueryFromBindings(
      dateDefinition,
      {
        groupBindings: { periodStart: { type: "static", value: "2025-01" } },
        dimensionBindings: {
          categoryId: { type: "static", value: "food" },
        },
      },
      {},
    );

    expect(query).toEqual({
      group: { periodStart: "2025-01" },
      dimensions: { categoryId: "food" },
    });
  });

  it("falls back to dashboardDateFilter when month binding is missing", () => {
    const dateDefinition: MetricDefinitionRecord = {
      ...definition,
      groupBy: ["categoryId"],
      dimensions: ["date"],
      dateFieldGranularity: { date: "month" },
    };

    const query = buildMetricRowQueryFromBindings(
      dateDefinition,
      {
        groupBindings: {
          categoryId: { type: "static", value: "food" },
        },
        dimensionBindings: {},
      },
      {
        dashboardDateFilter: {
          value: "2026-06",
          granularity: "month",
          param: "month",
        },
      },
    );

    expect(query).toEqual({
      group: { categoryId: "food" },
      dimensions: { date: "2026-06" },
    });
  });

  it("falls back to dashboardDateFilter when month static binding is empty", () => {
    const dateDefinition: MetricDefinitionRecord = {
      ...definition,
      groupBy: ["date"],
      dimensions: [],
      dateFieldGranularity: { date: "month" },
    };

    const query = buildMetricRowQueryFromBindings(
      dateDefinition,
      {
        groupBindings: { date: { type: "static", value: "" } },
        dimensionBindings: {},
      },
      {
        dashboardDateFilter: {
          value: "2026-06",
          granularity: "month",
          param: "month",
        },
      },
    );

    expect(query).toEqual({
      group: { date: "2026-06" },
      dimensions: {},
    });
  });

  it("returns null when a non-month field is empty even with dashboardDateFilter", () => {
    const dateDefinition: MetricDefinitionRecord = {
      ...definition,
      groupBy: ["categoryId"],
      dimensions: ["date"],
      dateFieldGranularity: { date: "month" },
    };

    expect(
      buildMetricRowQueryFromBindings(
        dateDefinition,
        {
          groupBindings: { categoryId: { type: "static", value: "" } },
          dimensionBindings: {
            date: { type: "routeParam", param: "month" },
          },
        },
        {
          dashboardDateFilter: {
            value: "2026-06",
            granularity: "month",
            param: "month",
          },
        },
      ),
    ).toBeNull();
  });

  it("keeps routeParam month behavior when dashboardDateFilter is absent", () => {
    const dateDefinition: MetricDefinitionRecord = {
      ...definition,
      groupBy: ["date"],
      dimensions: [],
      dateFieldGranularity: { date: "month" },
    };

    const query = buildMetricRowQueryFromBindings(
      dateDefinition,
      {
        groupBindings: { date: { type: "routeParam", param: "month" } },
        dimensionBindings: {},
      },
      { routeParams: { month: "2025-03" } },
    );

    expect(query).toEqual({
      group: { date: "2025-03" },
      dimensions: {},
    });
  });
});
