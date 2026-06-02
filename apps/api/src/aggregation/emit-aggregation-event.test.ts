import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  createInMemoryAggregationEventRepository,
  createInMemoryBackfillJobRepository,
  createInMemoryMetricContributionRepository,
  createInMemoryMetricDefinitionRepository,
  createInMemoryMetricValueRepository,
} from "@repo/firestore-converters";

import { emitAggregationEventIfNeeded } from "./emit-aggregation-event.js";
import { createMetricRuntimeContext } from "./metric-runtime-context.js";

const { publishAggregationEventMessage } = vi.hoisted(() => ({
  publishAggregationEventMessage: vi.fn(async () => undefined),
}));

vi.mock("@repo/gcp-firebase", () => ({
  AGGREGATION_EVENTS_TOPIC: "aggregation-events",
  publishAggregationEventMessage,
}));

describe("emitAggregationEventIfNeeded", () => {
  const tenantId = "tenant_a";

  beforeEach(() => {
    publishAggregationEventMessage.mockClear();
  });

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
      sourceModel: "loan",
      filters: [],
      groupBy: [],
      dimensions: [],
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
        after: { amount: 100 },
        businessFieldNames: ["amount"],
      },
    );

    expect(publishAggregationEventMessage).not.toHaveBeenCalled();
    expect(aggregationEventRepository.store.size).toBe(1);
    expect(metricValueRepository.store.size).toBe(1);
    expect(
      [...metricValueRepository.store.values()][0]?.values.sum_amount,
    ).toBe(100);

    const event = [...aggregationEventRepository.store.values()][0];
    expect(event?.status).toBe("PROCESSED");
  });

  it("publishes to Pub/Sub without inline processing when enabled", async () => {
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
      sourceModel: "loan",
      filters: [],
      groupBy: [],
      dimensions: [],
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

    expect(publishAggregationEventMessage).toHaveBeenCalledWith(
      "demo-project-base",
      "aggregation-events",
      expect.objectContaining({ tenantId }),
    );
    expect(metricValueRepository.store.size).toBe(0);

    const event = [...aggregationEventRepository.store.values()][0];
    expect(event?.status).toBe("PENDING");
  });
});
