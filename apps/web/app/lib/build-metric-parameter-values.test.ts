import { describe, expect, it } from "vitest";

import type { MetricDefinitionRecord } from "./api-client.js";
import { buildMetricParameterValuesFromBindings } from "./build-metric-parameter-values.js";

const computedDefinition: MetricDefinitionRecord = {
  id: "metric_mom",
  tenantId: "tenant_a",
  metricId: "income_mom",
  name: "Income MoM %",
  computationMode: "computed",
  sourceModel: "transaction",
  filters: [],
  groupBy: [],
  dimensions: [],
  dateFieldGranularity: {},
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
  aggregations: [{ operation: "COUNT" }],
  target: { collection: "metric_mom", granularity: "dynamic" },
  version: 1,
  schemaVersionDependency: 0,
  fieldsDependency: [],
  status: "ACTIVE",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

describe("buildMetricParameterValuesFromBindings", () => {
  it("returns null when required parameter bindings are missing", () => {
    expect(
      buildMetricParameterValuesFromBindings(
        computedDefinition,
        {},
        {
          dashboardDateFilter: {
            value: "2026-06",
            granularity: "month",
            param: "date",
          },
        },
      ),
    ).toBeNull();
  });

  it("resolves dashboardDateFilter into currentPeriod", () => {
    expect(
      buildMetricParameterValuesFromBindings(
        computedDefinition,
        {
          currentPeriod: { type: "dashboardDateFilter" },
        },
        {
          dashboardDateFilter: {
            value: "2026-06",
            granularity: "month",
            param: "date",
          },
        },
      ),
    ).toEqual({ currentPeriod: "2026-06" });
  });
});
