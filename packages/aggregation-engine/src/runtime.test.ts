import { describe, expect, it, vi } from "vitest";

import type { AggregationEvent } from "@repo/event-engine";
import {
  createInMemoryAggregationEventRepository,
  createInMemoryMetricDefinitionRepository,
  createInMemoryMetricContributionRepository,
  createInMemoryMetricValueRepository,
} from "@repo/firestore-converters";

import { processAggregationEventTransaction } from "./runtime.js";

const baseEvent: AggregationEvent = {
  eventId: "evt_1",
  tenantId: "tenant_a",
  model: "loan",
  operation: "CREATE",
  documentId: "loan_1",
  before: null,
  after: { amount: 100 },
  changedFields: ["amount"],
  schemaVersion: 1,
  timestamp: "2026-06-02T00:00:00.000Z",
  checksum: "abc",
  status: "PENDING",
  retries: 0,
};

describe("processAggregationEventTransaction", () => {
  it("skips non-pending events without reprocessing metrics", async () => {
    const metricDefinitionRepository =
      createInMemoryMetricDefinitionRepository();
    const aggregationEventRepository =
      createInMemoryAggregationEventRepository();
    const metricValueRepository = createInMemoryMetricValueRepository();
    const metricContributionRepository =
      createInMemoryMetricContributionRepository();

    await metricDefinitionRepository.create("tenant_a", {
      name: "Loan total",
      sourceModel: "loan",
      filters: [],
      groupBy: [],
      dimensions: [],
      aggregations: [{ field: "amount", operation: "SUM" }],
      target: { collection: "loan_total", granularity: "dynamic" },
      schemaVersionDependency: 1,
      fieldsDependency: ["amount"],
      status: "ACTIVE",
      version: 1,
    });

    await aggregationEventRepository.create("tenant_a", {
      ...baseEvent,
      status: "PROCESSED",
    });

    const log = vi.fn();
    await processAggregationEventTransaction(
      {
        aggregationEventRepository,
        metricDefinitionRepository,
        metricValueRepository,
        metricContributionRepository,
      },
      "tenant_a",
      "evt_1",
      log,
    );

    expect(metricValueRepository.store.size).toBe(0);
    expect(log).toHaveBeenCalledWith(
      "aggregation_event_skipped",
      expect.objectContaining({ reason: "status_processed" }),
    );
  });
});
