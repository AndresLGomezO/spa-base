import { describe, expect, it } from "vitest";

import {
  exportMetricFormState,
  exportMetricRecord,
  importMetricFormState,
} from "./export-metric-form-state";
import type { MetricDefinitionRecord } from "../../../lib/api-client";

const sampleRecord: MetricDefinitionRecord = {
  id: "metric_1",
  tenantId: "tenant_a",
  metricId: "total_principal",
  name: "Total principal",
  sourceModel: "loan",
  filters: [{ field: "status", op: "eq", value: "ACTIVE" }],
  groupBy: ["region"],
  dimensions: [],
  dateFieldGranularity: {},
  valueDisplayFormat: "currency",
  computationMode: "aggregated",
  parameters: [],
  aggregations: [{ operation: "SUM", field: "principal" }],
  target: { collection: "metric_1", granularity: "dynamic" },
  version: 2,
  schemaVersionDependency: 1,
  fieldsDependency: ["principal"],
  status: "ACTIVE",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-02-01T00:00:00.000Z",
};

const computedRecord: MetricDefinitionRecord = {
  ...sampleRecord,
  id: "metric_mom",
  metricId: "total_balance_mom",
  name: "Total Balance MoM %",
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
      metricDefinitionId: "Total Balance by Month",
      parameterMap: { period: "currentPeriod" },
    },
    baseline: {
      type: "metricRef",
      metricDefinitionId: "Total Balance by Month",
      parameterMap: { period: "comparisonPeriod" },
    },
  },
  aggregations: [{ operation: "COUNT" }],
  filters: [],
  groupBy: [],
  dimensions: [],
  fieldsDependency: [],
};

describe("export-metric-form-state", () => {
  it("exports a metric record without server fields", () => {
    const portable = exportMetricRecord(sampleRecord);
    expect(portable).not.toHaveProperty("id");
    expect(portable).not.toHaveProperty("target");
    expect(portable.name).toBe("Total principal");
    expect(portable.aggregations?.[0]).toEqual({
      operation: "SUM",
      field: "principal",
    });
  });

  it("exports computed metrics with parameters and computation", () => {
    const portable = exportMetricRecord(computedRecord);
    expect(portable.computationMode).toBe("computed");
    expect(portable.parameters).toHaveLength(2);
    expect(portable.computation?.type).toBe("percentChange");
  });

  it("round-trips aggregated editor form state", () => {
    const exported = exportMetricFormState({
      name: "Loan count",
      description: "",
      computationMode: "aggregated",
      sourceModel: "loan",
      sourceType: "entity",
      sourceQueryDefinitionId: "",
      status: "ACTIVE",
      aggregationOperation: "COUNT",
      aggregationField: "",
      fieldsDependency: [],
      filterRows: [],
      groupBy: [],
      dimensions: [],
      dateFieldGranularity: {},
      parameters: [],
      computation: undefined,
      valueDisplayFormat: "number",
      version: 1,
      schemaVersionDependency: 0,
    });

    const imported = importMetricFormState(exported);
    expect(imported.name).toBe("Loan count");
    expect(imported.aggregationOperation).toBe("COUNT");
    expect(imported.computationMode).toBe("aggregated");
  });

  it("round-trips computed editor form state", () => {
    const exported = exportMetricFormState({
      name: "Income MoM %",
      description: "MoM",
      computationMode: "computed",
      sourceModel: "transaction",
      sourceType: "entity",
      sourceQueryDefinitionId: "",
      status: "ACTIVE",
      aggregationOperation: "COUNT",
      aggregationField: "",
      fieldsDependency: [],
      filterRows: [],
      groupBy: [],
      dimensions: [],
      dateFieldGranularity: {},
      parameters: [
        {
          name: "currentPeriod",
          valueType: "dateBucket",
          granularity: "month",
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
      valueDisplayFormat: "percent",
      version: 1,
      schemaVersionDependency: 0,
    });

    const imported = importMetricFormState(exported);
    expect(imported.computationMode).toBe("computed");
    expect(imported.parameters).toHaveLength(1);
    expect(imported.computation?.type).toBe("percentChange");
    expect(imported.valueDisplayFormat).toBe("percent");
  });
});
