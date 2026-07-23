import { describe, expect, it, vi } from "vitest";

import {
  createInMemoryAggregationEventRepository,
  createInMemoryBackfillJobRepository,
  createInMemoryMetricContributionRepository,
  createInMemoryMetricDefinitionRepository,
  createInMemoryMetricValueRepository,
} from "@repo/firestore-converters";

import { emitAggregationEventIfNeeded } from "./emit-aggregation-event.js";
import { createMetricRuntimeContext } from "./metric-runtime-context.js";

describe("emitAggregationEventIfNeeded", () => {
  const tenantId = "tenant_a";

  it("processes metric values inline when Pub/Sub is disabled", async () => {
    const metricDefinitionRepository =
      createInMemoryMetricDefinitionRepository();
    const aggregationEventRepository =
      createInMemoryAggregationEventRepository();
    const metricValueRepository = createInMemoryMetricValueRepository();
    const backfillJobRepository = createInMemoryBackfillJobRepository();
    const metricContributionRepository =
      createInMemoryMetricContributionRepository();

    await metricDefinitionRepository.create(tenantId, {
      name: "Loan amount total",
      computationMode: "aggregated",
      sourceModel: "loan",
      filters: [],
      groupBy: [],
      dimensions: [],
      dateFieldGranularity: {},
      valueDisplayFormat: "number",
      parameters: [],
      aggregations: [{ field: "amount", operation: "SUM" }],
      target: { collection: "loan_amount_total", granularity: "dynamic" },
      schemaVersionDependency: 1,
      fieldsDependency: ["amount"],
      status: "ACTIVE",
      version: 1,
    });

    const metricRuntime = createMetricRuntimeContext({
      metricDefinitionRepository,
      aggregationEventRepository,
      metricValueRepository,
      backfillJobRepository,
      metricContributionRepository,
    });

    await emitAggregationEventIfNeeded(
      {
        metricRuntime,
        publishToPubSub: false,
        aggregationTopic: "aggregation-events",
        projectId: "demo-project-base",
        getSchemaVersion: () => 1,
      },
      {
        tenantId,
        entityName: "loan",
        operation: "CREATE",
        documentId: "loan_1",
        before: null,
        after: { amount: 100, ownerId: "user_owner" },
        businessFieldNames: ["amount"],
      },
    );

    expect(aggregationEventRepository.store.size).toBe(1);
    expect(metricValueRepository.store.size).toBe(1);
    expect(
      [...metricValueRepository.store.values()][0]?.values.sum_amount,
    ).toBe(100);

    const event = [...aggregationEventRepository.store.values()][0];
    expect(event?.status).toBe("PROCESSED");
  });

  it("publishes via injectable publisher without inline processing", async () => {
    const publishAggregationEvent = vi.fn(async () => undefined);
    const metricDefinitionRepository =
      createInMemoryMetricDefinitionRepository();
    const aggregationEventRepository =
      createInMemoryAggregationEventRepository();
    const metricValueRepository = createInMemoryMetricValueRepository();
    const backfillJobRepository = createInMemoryBackfillJobRepository();
    const metricContributionRepository =
      createInMemoryMetricContributionRepository();

    await metricDefinitionRepository.create(tenantId, {
      name: "Loan amount total",
      computationMode: "aggregated",
      sourceModel: "loan",
      filters: [],
      groupBy: [],
      dimensions: [],
      dateFieldGranularity: {},
      valueDisplayFormat: "number",
      parameters: [],
      aggregations: [{ field: "amount", operation: "SUM" }],
      target: { collection: "loan_amount_total", granularity: "dynamic" },
      schemaVersionDependency: 1,
      fieldsDependency: ["amount"],
      status: "ACTIVE",
      version: 1,
    });

    const metricRuntime = createMetricRuntimeContext({
      metricDefinitionRepository,
      aggregationEventRepository,
      metricValueRepository,
      backfillJobRepository,
      metricContributionRepository,
    });

    await emitAggregationEventIfNeeded(
      {
        metricRuntime,
        publishToPubSub: true,
        aggregationTopic: "aggregation-events",
        projectId: "demo-project-base",
        getSchemaVersion: () => 1,
        publishAggregationEvent,
      },
      {
        tenantId,
        entityName: "loan",
        operation: "CREATE",
        documentId: "loan_1",
        before: null,
        after: { amount: 100 },
        businessFieldNames: ["amount"],
      },
    );

    expect(publishAggregationEvent).toHaveBeenCalledWith(
      "demo-project-base",
      "aggregation-events",
      expect.objectContaining({ tenantId }),
    );
    expect(metricValueRepository.store.size).toBe(0);

    const event = [...aggregationEventRepository.store.values()][0];
    expect(event?.status).toBe("PENDING");
  });

  it("falls back to inline processing when Pub/Sub publish fails", async () => {
    const publishAggregationEvent = vi.fn(async () => {
      throw new Error("Topic not found");
    });
    const metricDefinitionRepository =
      createInMemoryMetricDefinitionRepository();
    const aggregationEventRepository =
      createInMemoryAggregationEventRepository();
    const metricValueRepository = createInMemoryMetricValueRepository();
    const backfillJobRepository = createInMemoryBackfillJobRepository();
    const metricContributionRepository =
      createInMemoryMetricContributionRepository();

    await metricDefinitionRepository.create(tenantId, {
      name: "Loan amount total",
      computationMode: "aggregated",
      sourceModel: "loan",
      filters: [],
      groupBy: [],
      dimensions: [],
      dateFieldGranularity: {},
      valueDisplayFormat: "number",
      parameters: [],
      aggregations: [{ field: "amount", operation: "SUM" }],
      target: { collection: "loan_amount_total", granularity: "dynamic" },
      schemaVersionDependency: 1,
      fieldsDependency: ["amount"],
      status: "ACTIVE",
      version: 1,
    });

    const metricRuntime = createMetricRuntimeContext({
      metricDefinitionRepository,
      aggregationEventRepository,
      metricValueRepository,
      backfillJobRepository,
      metricContributionRepository,
    });

    await emitAggregationEventIfNeeded(
      {
        metricRuntime,
        publishToPubSub: true,
        aggregationTopic: "aggregation-events",
        projectId: "demo-project-base",
        getSchemaVersion: () => 1,
        publishAggregationEvent,
      },
      {
        tenantId,
        entityName: "loan",
        operation: "CREATE",
        documentId: "loan_1",
        before: null,
        after: { amount: 50, ownerId: "user_owner" },
        businessFieldNames: ["amount"],
      },
    );

    expect(publishAggregationEvent).toHaveBeenCalled();
    expect(metricValueRepository.store.size).toBe(1);
    expect(
      [...metricValueRepository.store.values()][0]?.values.sum_amount,
    ).toBe(50);
    expect([...aggregationEventRepository.store.values()][0]?.status).toBe(
      "PROCESSED",
    );
  });
});
