import { describe, expect, it } from "vitest";

import { buildAggregationEvent } from "@repo/event-engine";
import {
  buildMetricDocId,
  type MetricDefinitionRecord,
} from "@repo/metrics-engine";
import {
  createInMemoryMetricContributionRepository,
  createInMemoryMetricDefinitionRepository,
  createInMemoryMetricValueRepository,
} from "@repo/firestore-converters";

import { computeMetricDeltas } from "./delta.js";
import { processAggregationEvent } from "./process-event.js";
import { createMetricValueWriter } from "./runtime.js";
import { runSnapshotBackfillForMetric } from "./snapshot-backfill.js";

const baseMetric: MetricDefinitionRecord = {
  id: "metric_1",
  tenantId: "tenant_a",
  metricId: "txn_totals",
  name: "Transaction Totals",
  sourceModel: "transaction",
  filters: [],
  groupBy: [],
  dimensions: [],
  aggregations: [{ field: "amount", operation: "SUM" }],
  target: { collection: "txn_totals", granularity: "dynamic" },
  version: 1,
  schemaVersionDependency: 1,
  fieldsDependency: ["amount"],
  status: "ACTIVE",
  createdAt: "2026-06-01T00:00:00.000Z",
  updatedAt: "2026-06-01T00:00:00.000Z",
};

describe("computeMetricDeltas", () => {
  it("adds on create", () => {
    const event = buildAggregationEvent({
      tenantId: "tenant_a",
      model: "transaction",
      operation: "CREATE",
      documentId: "doc_1",
      before: null,
      after: { amount: 100 },
      businessFieldNames: ["amount"],
      schemaVersion: 1,
    });

    const deltas = computeMetricDeltas(event, baseMetric);
    expect(deltas).toHaveLength(1);
    expect(deltas[0]?.increments.sum_amount).toBe(100);
  });

  it("subtracts on delete", () => {
    const event = buildAggregationEvent({
      tenantId: "tenant_a",
      model: "transaction",
      operation: "DELETE",
      documentId: "doc_1",
      before: { amount: 50 },
      after: null,
      businessFieldNames: ["amount"],
      schemaVersion: 1,
    });

    const deltas = computeMetricDeltas(event, baseMetric);
    expect(deltas[0]?.increments.sum_amount).toBe(-50);
  });

  it("computes numeric update delta", () => {
    const event = buildAggregationEvent({
      tenantId: "tenant_a",
      model: "transaction",
      operation: "UPDATE",
      documentId: "doc_1",
      before: { amount: 10 },
      after: { amount: 25 },
      businessFieldNames: ["amount"],
      schemaVersion: 1,
    });

    const deltas = computeMetricDeltas(event, baseMetric);
    expect(deltas[0]?.increments.sum_amount).toBe(15);
  });

  it("treats pre-metric update as first inclusion when not contributed", () => {
    const event = buildAggregationEvent({
      tenantId: "tenant_a",
      model: "transaction",
      operation: "UPDATE",
      documentId: "doc_1",
      before: { amount: 1000 },
      after: { amount: 1 },
      businessFieldNames: ["amount"],
      schemaVersion: 1,
    });

    const deltas = computeMetricDeltas(event, baseMetric, {
      hasContributed: false,
    });
    expect(deltas).toHaveLength(1);
    expect(deltas[0]?.increments.sum_amount).toBe(1);
  });

  it("skips delete when document never contributed", () => {
    const event = buildAggregationEvent({
      tenantId: "tenant_a",
      model: "transaction",
      operation: "DELETE",
      documentId: "doc_1",
      before: { amount: 50 },
      after: null,
      businessFieldNames: ["amount"],
      schemaVersion: 1,
    });

    const deltas = computeMetricDeltas(event, baseMetric, {
      hasContributed: false,
    });
    expect(deltas).toHaveLength(0);
  });

  it("counts documents on create and delete", () => {
    const countMetric: MetricDefinitionRecord = {
      ...baseMetric,
      aggregations: [{ operation: "COUNT" }],
      fieldsDependency: [],
      target: { collection: "txn_count", granularity: "dynamic" },
    };

    const createEvent = buildAggregationEvent({
      tenantId: "tenant_a",
      model: "transaction",
      operation: "CREATE",
      documentId: "doc_1",
      before: null,
      after: { amount: 100 },
      businessFieldNames: ["amount"],
      schemaVersion: 1,
    });

    expect(
      computeMetricDeltas(createEvent, countMetric)[0]?.increments.count,
    ).toBe(1);

    const deleteEvent = buildAggregationEvent({
      tenantId: "tenant_a",
      model: "transaction",
      operation: "DELETE",
      documentId: "doc_1",
      before: { amount: 100 },
      after: null,
      businessFieldNames: ["amount"],
      schemaVersion: 1,
    });

    expect(
      computeMetricDeltas(deleteEvent, countMetric)[0]?.increments.count,
    ).toBe(-1);
  });
});

describe("processAggregationEvent contribution ledger", () => {
  it("marks contribution after pre-metric update", async () => {
    const metricContributionRepository =
      createInMemoryMetricContributionRepository();
    const metricValueRepository = createInMemoryMetricValueRepository();

    const event = buildAggregationEvent({
      tenantId: "tenant_a",
      model: "transaction",
      operation: "UPDATE",
      documentId: "doc_1",
      before: { amount: 1000 },
      after: { amount: 1 },
      businessFieldNames: ["amount"],
      schemaVersion: 1,
    });

    await processAggregationEvent({
      event,
      definitions: [baseMetric],
      writer: createMetricValueWriter(metricValueRepository),
      metricContributionRepository,
    });

    expect(
      await metricContributionRepository.hasContributed(
        "tenant_a",
        "metric_1",
        "doc_1",
      ),
    ).toBe(true);
    expect(
      [...metricValueRepository.store.values()][0]?.values.sum_amount,
    ).toBe(1);
  });

  it("applies net delta on second update after contribution", async () => {
    const metricContributionRepository =
      createInMemoryMetricContributionRepository();
    const metricValueRepository = createInMemoryMetricValueRepository();

    await metricContributionRepository.markContributed(
      "tenant_a",
      "metric_1",
      "doc_1",
      "evt_seed",
    );
    const docId = buildMetricDocId({}, {});
    await metricValueRepository.applyIncrements(
      "tenant_a",
      "txn_totals",
      docId,
      {
        group: {},
        dimensions: {},
        increments: { sum_amount: 1 },
      },
    );

    const event = buildAggregationEvent({
      tenantId: "tenant_a",
      model: "transaction",
      operation: "UPDATE",
      documentId: "doc_1",
      before: { amount: 1 },
      after: { amount: 5 },
      businessFieldNames: ["amount"],
      schemaVersion: 1,
    });

    await processAggregationEvent({
      event,
      definitions: [baseMetric],
      writer: createMetricValueWriter(metricValueRepository),
      metricContributionRepository,
    });

    expect(
      [...metricValueRepository.store.values()][0]?.values.sum_amount,
    ).toBe(5);
  });
});

describe("runSnapshotBackfillForMetric", () => {
  it("rebuilds metric values from source documents and seeds ledger", async () => {
    const metricDefinitionRepository =
      createInMemoryMetricDefinitionRepository();
    const metricValueRepository = createInMemoryMetricValueRepository();
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

    const metric = (await metricDefinitionRepository.getById(
      "tenant_a",
      created.id,
    ))!;

    await metricValueRepository.applyIncrements(
      "tenant_a",
      metric.target.collection,
      "default",
      {
        group: {},
        dimensions: {},
        increments: { sum_amount: -999 },
      },
    );

    const result = await runSnapshotBackfillForMetric({
      tenantId: "tenant_a",
      metric,
      documents: [
        { documentId: "doc_1", record: { amount: 1 } },
        { documentId: "doc_2", record: { amount: 4 } },
      ],
      metricValueRepository,
      metricContributionRepository,
    });

    expect(result.processedDocuments).toBe(2);
    expect(
      [...metricValueRepository.store.values()][0]?.values.sum_amount,
    ).toBe(5);
    expect(
      await metricContributionRepository.hasContributed(
        "tenant_a",
        metric.id,
        "doc_1",
      ),
    ).toBe(true);
  });
});

describe("AVG metric storage", () => {
  it("computes avg delta components on create", () => {
    const avgMetric: MetricDefinitionRecord = {
      ...baseMetric,
      aggregations: [{ field: "amount", operation: "AVG" }],
      target: { collection: "txn_avg", granularity: "dynamic" },
    };

    const event = buildAggregationEvent({
      tenantId: "tenant_a",
      model: "transaction",
      operation: "CREATE",
      documentId: "doc_1",
      before: null,
      after: { amount: 100 },
      businessFieldNames: ["amount"],
      schemaVersion: 1,
    });

    const deltas = computeMetricDeltas(event, avgMetric);
    expect(deltas[0]?.increments.sum_amount).toBe(100);
    expect(deltas[0]?.increments.count_amount).toBe(1);
  });

  it("stores avg_amount after applying AVG increments", async () => {
    const metricValueRepository = createInMemoryMetricValueRepository();
    const avgMetric: MetricDefinitionRecord = {
      ...baseMetric,
      aggregations: [{ field: "amount", operation: "AVG" }],
      target: { collection: "txn_avg", granularity: "dynamic" },
    };

    const event = buildAggregationEvent({
      tenantId: "tenant_a",
      model: "transaction",
      operation: "CREATE",
      documentId: "doc_1",
      before: null,
      after: { amount: 100 },
      businessFieldNames: ["amount"],
      schemaVersion: 1,
    });

    await processAggregationEvent({
      event,
      definitions: [avgMetric],
      writer: createMetricValueWriter(metricValueRepository),
    });

    const record = [...metricValueRepository.store.values()][0];
    expect(record?.values.sum_amount).toBe(100);
    expect(record?.values.count_amount).toBe(1);
    expect(record?.values.avg_amount).toBe(100);
  });
});
