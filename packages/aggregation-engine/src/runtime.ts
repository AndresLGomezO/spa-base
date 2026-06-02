import type { AggregationEvent } from "@repo/event-engine";
import type {
  AggregationEventRepository,
  MetricContributionRepository,
  MetricDefinitionRepository,
  MetricValueRepository,
} from "@repo/firestore-converters";

import {
  processAggregationEvent,
  type MetricValueWriter,
} from "./process-event.js";

export function createMetricValueWriter(
  metricValueRepository: MetricValueRepository,
): MetricValueWriter {
  return {
    async applyDeltas(tenantId, deltas) {
      for (const delta of deltas) {
        await metricValueRepository.applyIncrements(
          tenantId,
          delta.metricName,
          delta.docId,
          {
            userId: delta.userId,
            group: delta.group,
            dimensions: delta.dimensions,
            increments: delta.increments,
          },
        );
      }
    },
  };
}

export interface MetricProcessingRepositories {
  readonly metricDefinitionRepository: MetricDefinitionRepository;
  readonly metricValueRepository: MetricValueRepository;
  readonly metricContributionRepository?: MetricContributionRepository;
}

export async function processEventWithRepositories(input: {
  readonly event: AggregationEvent;
  readonly metricDefinitionRepository: MetricDefinitionRepository;
  readonly metricValueRepository: MetricValueRepository;
  readonly metricContributionRepository?: MetricContributionRepository;
}): Promise<void> {
  const definitions = await input.metricDefinitionRepository.listActive(
    input.event.tenantId,
  );

  await processAggregationEvent({
    event: input.event,
    definitions,
    writer: createMetricValueWriter(input.metricValueRepository),
    metricContributionRepository: input.metricContributionRepository,
  });
}

export async function processAggregationEventTransaction(
  deps: MetricProcessingRepositories & {
    readonly aggregationEventRepository: AggregationEventRepository;
  },
  tenantId: string,
  eventId: string,
  log?: (message: string, meta: Record<string, unknown>) => void,
): Promise<void> {
  const startedAt = Date.now();
  let event: AggregationEvent | null = null;

  for (let attempt = 0; attempt < 5; attempt += 1) {
    event = await deps.aggregationEventRepository.getById(tenantId, eventId);
    if (event) {
      break;
    }
    await new Promise((resolve) => setTimeout(resolve, 100 * (attempt + 1)));
  }

  if (!event) {
    throw new Error(`Aggregation event not found: ${eventId}`);
  }

  if (event.status !== "PENDING") {
    log?.("aggregation_event_skipped", {
      eventId,
      tenantId,
      reason: `status_${event.status.toLowerCase()}`,
    });
    return;
  }

  try {
    await processEventWithRepositories({
      event,
      metricDefinitionRepository: deps.metricDefinitionRepository,
      metricValueRepository: deps.metricValueRepository,
      metricContributionRepository: deps.metricContributionRepository,
    });

    await deps.aggregationEventRepository.updateStatus(
      tenantId,
      eventId,
      "PROCESSED",
    );

    log?.("aggregation_event_processed", {
      eventId,
      tenantId,
      model: event.model,
      latencyMs: Date.now() - startedAt,
    });
  } catch (error) {
    await deps.aggregationEventRepository.updateStatus(
      tenantId,
      eventId,
      "FAILED",
      event.retries + 1,
    );
    log?.("aggregation_event_failed", {
      eventId,
      tenantId,
      model: event.model,
      latencyMs: Date.now() - startedAt,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

export async function replayAggregationEvent(
  deps: MetricProcessingRepositories,
  event: AggregationEvent,
): Promise<void> {
  await processEventWithRepositories({
    event,
    metricDefinitionRepository: deps.metricDefinitionRepository,
    metricValueRepository: deps.metricValueRepository,
    metricContributionRepository: deps.metricContributionRepository,
  });
}
