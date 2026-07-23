import { describe, expect, it } from "vitest";

import {
  createMetricDefinitionsCatalogEnvelope,
  parseMetricDefinitionsCatalogJson,
  toPortableMetricDefinition,
  type MetricDefinitionRecord,
} from "@repo/metrics-engine";

const paidAmount: MetricDefinitionRecord = {
  id: "metric_paid",
  tenantId: "tenant_test",
  metricId: "paid_amount",
  name: "Paid Amount by Due Month",
  computationMode: "aggregated",
  sourceModel: "paymentSchedule",
  filters: [],
  groupBy: ["dueDate"],
  dimensions: [],
  dateFieldGranularity: { dueDate: "month" },
  valueDisplayFormat: "currency",
  parameters: [],
  aggregations: [{ operation: "SUM", field: "paidAmount" }],
  target: { collection: "metric_paid", granularity: "month" },
  version: 1,
  schemaVersionDependency: 0,
  fieldsDependency: ["paidAmount", "dueDate"],
  status: "ACTIVE",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

const scheduledAmount: MetricDefinitionRecord = {
  ...paidAmount,
  id: "metric_scheduled",
  metricId: "scheduled_amount",
  name: "Scheduled Amount by Due Month",
  aggregations: [{ operation: "SUM", field: "expectedAmount" }],
  fieldsDependency: ["expectedAmount", "dueDate"],
};

const paymentProgress: MetricDefinitionRecord = {
  ...paidAmount,
  id: "metric_progress",
  metricId: "payment_progress",
  name: "Payment Progress %",
  computationMode: "computed",
  sourceModel: "paymentSchedule",
  aggregations: [{ operation: "SUM", field: "paidAmount" }],
  fieldsDependency: ["paidAmount"],
  valueDisplayFormat: "percent",
  computation: {
    type: "ratio",
    numerator: {
      type: "metricRef",
      metricDefinitionId: "Paid Amount by Due Month",
      parameterMap: {},
    },
    denominator: {
      type: "metricRef",
      metricDefinitionId: "Scheduled Amount by Due Month",
      parameterMap: {},
    },
  },
};

describe("synthetic metric catalog", () => {
  it("defines Payment Progress % with metricRef inputs for fast evaluate", () => {
    const parsed = parseMetricDefinitionsCatalogJson(
      JSON.stringify(
        createMetricDefinitionsCatalogEnvelope([
          paidAmount,
          scheduledAmount,
          paymentProgress,
        ]),
      ),
    );
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) {
      return;
    }

    const progress = parsed.data.metricDefinitions.find(
      (metric) => metric.name === "Payment Progress %",
    );
    expect(progress?.computationMode).toBe("computed");
    expect(progress?.computation?.type).toBe("ratio");

    if (progress?.computation?.type !== "ratio") {
      return;
    }

    expect(progress.computation.numerator.type).toBe("metricRef");
    expect(progress.computation.denominator.type).toBe("metricRef");

    if (
      progress.computation.numerator.type !== "metricRef" ||
      progress.computation.denominator.type !== "metricRef"
    ) {
      return;
    }

    expect(progress.computation.numerator.metricDefinitionId).toBe(
      "Paid Amount by Due Month",
    );
    expect(progress.computation.denominator.metricDefinitionId).toBe(
      "Scheduled Amount by Due Month",
    );

    // Portable export strips ids; ensure ratio refs survive round-trip.
    expect(toPortableMetricDefinition(paymentProgress).computation?.type).toBe(
      "ratio",
    );
  });
});
