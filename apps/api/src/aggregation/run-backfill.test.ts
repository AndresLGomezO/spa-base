import { describe, expect, it } from "vitest";

import type { MetricDefinitionRecord } from "@repo/metrics-engine";

import { runMetricBackfill, validateBackfillRequest } from "./run-backfill.js";
import { createMetricRuntimeContext } from "./metric-runtime-context.js";
import {
  createInMemoryAggregationEventRepository,
  createInMemoryBackfillJobRepository,
  createInMemoryMetricContributionRepository,
  createInMemoryMetricDefinitionRepository,
  createInMemoryMetricValueRepository,
} from "@repo/firestore-converters";
import { buildAggregationEvent } from "@repo/event-engine";

const baseMetric: MetricDefinitionRecord = {
  id: "metric_1",
  tenantId: "tenant_a",
  metricId: "loan_total",
  name: "Loan total",
  sourceModel: "loan",
  filters: [],
  groupBy: [],
  dimensions: [],
  aggregations: [{ field: "amount", operation: "SUM" }],
  target: { collection: "loan_total", granularity: "dynamic" },
  version: 1,
  schemaVersionDependency: 1,
  fieldsDependency: ["amount"],
  status: "ACTIVE",
  createdAt: "2026-06-01T00:00:00.000Z",
  updatedAt: "2026-06-01T00:00:00.000Z",
};

describe("runMetricBackfill", () => {
  it("rebuilds from source documents on initial backfill", async () => {
    const metricDefinitionRepository =
      createInMemoryMetricDefinitionRepository();
    const aggregationEventRepository =
      createInMemoryAggregationEventRepository();
    const metricValueRepository = createInMemoryMetricValueRepository();
    const backfillJobRepository = createInMemoryBackfillJobRepository();
    const metricContributionRepository =
      createInMemoryMetricContributionRepository();

    const created = await metricDefinitionRepository.create("tenant_a", {
      name: baseMetric.name,
      sourceModel: baseMetric.sourceModel,
      filters: baseMetric.filters,
      groupBy: baseMetric.groupBy,
      dimensions: baseMetric.dimensions,
      aggregations: baseMetric.aggregations,
      schemaVersionDependency: baseMetric.schemaVersionDependency,
      fieldsDependency: baseMetric.fieldsDependency,
      status: baseMetric.status,
      version: baseMetric.version,
    });

    await aggregationEventRepository.create(
      "tenant_a",
      buildAggregationEvent({
        tenantId: "tenant_a",
        model: "loan",
        operation: "UPDATE",
        documentId: "loan_1",
        before: { amount: 1000 },
        after: { amount: 1 },
        businessFieldNames: ["amount"],
        schemaVersion: 1,
      }),
    );

    await metricValueRepository.applyIncrements(
      "tenant_a",
      created.target.collection,
      "default",
      {
        userId: "user_owner",
        group: {},
        dimensions: {},
        increments: { sum_amount: -999 },
      },
    );

    const metricRuntime = createMetricRuntimeContext({
      metricDefinitionRepository,
      aggregationEventRepository,
      metricValueRepository,
      backfillJobRepository,
      metricContributionRepository,
      listSourceDocuments: async () => [
        {
          documentId: "loan_1",
          record: { amount: 1, ownerId: "user_owner" },
        },
        {
          documentId: "loan_2",
          record: { amount: 50, ownerId: "user_owner" },
        },
      ],
    });

    const result = await runMetricBackfill(
      metricRuntime,
      "tenant_a",
      created.id,
    );

    expect(result.processedDocuments).toBe(2);
    expect(
      [...metricValueRepository.store.values()][0]?.values.sum_amount,
    ).toBe(51);
    expect(
      await backfillJobRepository.hasCompletedBackfillForMetric(
        "tenant_a",
        created.id,
      ),
    ).toBe(true);
  });

  it("rejects repeat backfill without a version bump", async () => {
    const metricDefinitionRepository =
      createInMemoryMetricDefinitionRepository();
    const aggregationEventRepository =
      createInMemoryAggregationEventRepository();
    const metricValueRepository = createInMemoryMetricValueRepository();
    const backfillJobRepository = createInMemoryBackfillJobRepository();
    const metricContributionRepository =
      createInMemoryMetricContributionRepository();

    const created = await metricDefinitionRepository.create("tenant_a", {
      name: baseMetric.name,
      sourceModel: baseMetric.sourceModel,
      filters: baseMetric.filters,
      groupBy: baseMetric.groupBy,
      dimensions: baseMetric.dimensions,
      aggregations: baseMetric.aggregations,
      schemaVersionDependency: baseMetric.schemaVersionDependency,
      fieldsDependency: baseMetric.fieldsDependency,
      status: baseMetric.status,
      version: baseMetric.version,
    });
    const metricRuntime = createMetricRuntimeContext({
      metricDefinitionRepository,
      aggregationEventRepository,
      metricValueRepository,
      backfillJobRepository,
      metricContributionRepository,
      listSourceDocuments: async () => [],
    });

    await runMetricBackfill(metricRuntime, "tenant_a", created.id);

    await expect(
      runMetricBackfill(metricRuntime, "tenant_a", created.id),
    ).rejects.toThrow(
      /Update the metric definition before running backfill again/,
    );
  });
});

describe("validateBackfillRequest", () => {
  it("requires a version increase on subsequent backfills", () => {
    expect(() =>
      validateBackfillRequest({
        current: { ...baseMetric, version: 1 },
        previousVersion: 1,
        changedDefinitionFields: ["amount"],
      }),
    ).toThrow(/version increase/);
  });
});
