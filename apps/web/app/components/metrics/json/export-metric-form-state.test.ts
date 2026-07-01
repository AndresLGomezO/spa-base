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
  aggregations: [{ operation: "SUM", field: "principal" }],
  target: { collection: "metric_1", granularity: "dynamic" },
  version: 2,
  schemaVersionDependency: 1,
  fieldsDependency: ["principal"],
  status: "ACTIVE",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-02-01T00:00:00.000Z",
};

describe("export-metric-form-state", () => {
  it("exports a metric record without server fields", () => {
    const portable = exportMetricRecord(sampleRecord);
    expect(portable).not.toHaveProperty("id");
    expect(portable).not.toHaveProperty("target");
    expect(portable.name).toBe("Total principal");
    expect(portable.aggregations[0]).toEqual({
      operation: "SUM",
      field: "principal",
    });
  });

  it("round-trips editor form state", () => {
    const exported = exportMetricFormState({
      name: "Loan count",
      description: "",
      sourceModel: "loan",
      status: "ACTIVE",
      aggregationOperation: "COUNT",
      aggregationField: "",
      fieldsDependency: [],
      filterRows: [],
      groupBy: [],
      dimensions: [],
      dateFieldGranularity: {},
      valueDisplayFormat: "number",
      version: 1,
      schemaVersionDependency: 0,
    });

    const imported = importMetricFormState(exported);
    expect(imported.name).toBe("Loan count");
    expect(imported.aggregationOperation).toBe("COUNT");
    expect(imported.aggregationField).toBe("");
  });
});
