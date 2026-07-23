import {
  buildAggregationEvent,
  type AggregationEventOperation,
} from "@repo/event-engine";

import { processAggregationEventTransaction } from "./runtime.js";
import type { MetricRuntimeContext } from "./metric-runtime-context.js";

export type AggregationEventPublishMessage = {
  readonly eventId: string;
  readonly tenantId: string;
};

export interface AggregationEmitterDeps {
  readonly metricRuntime: MetricRuntimeContext;
  readonly publishToPubSub: boolean;
  /**
   * Required when `publishToPubSub` is true. Kept injectable so this package
   * does not depend on GCP Pub/Sub clients.
   */
  readonly publishAggregationEvent?: (
    projectId: string,
    topic: string,
    message: AggregationEventPublishMessage,
  ) => Promise<void>;
  readonly aggregationTopic: string;
  readonly projectId: string;
  readonly getSchemaVersion: (entityName: string, tenantId: string) => number;
  readonly log?: (message: string, meta: Record<string, unknown>) => void;
}

export async function emitAggregationEventIfNeeded(
  deps: AggregationEmitterDeps,
  input: {
    readonly tenantId: string;
    readonly entityName: string;
    readonly operation: AggregationEventOperation;
    readonly documentId: string;
    readonly before: Record<string, unknown> | null;
    readonly after: Record<string, unknown> | null;
    readonly businessFieldNames: readonly string[];
  },
): Promise<void> {
  const hasMetrics =
    await deps.metricRuntime.activeMetricIndex.hasActiveMetrics(
      input.tenantId,
      input.entityName,
    );
  if (!hasMetrics) {
    return;
  }

  const event = buildAggregationEvent({
    tenantId: input.tenantId,
    model: input.entityName,
    operation: input.operation,
    documentId: input.documentId,
    before: input.before,
    after: input.after,
    businessFieldNames: input.businessFieldNames,
    schemaVersion: deps.getSchemaVersion(input.entityName, input.tenantId),
  });

  await deps.metricRuntime.aggregationEventRepository.create(
    input.tenantId,
    event,
  );

  deps.log?.("aggregation_event_emitted", {
    eventId: event.eventId,
    tenantId: event.tenantId,
    model: event.model,
    operation: event.operation,
    documentId: event.documentId,
  });

  if (deps.publishToPubSub) {
    if (!deps.publishAggregationEvent) {
      throw new Error(
        "publishAggregationEvent is required when publishToPubSub is true.",
      );
    }
    try {
      await deps.publishAggregationEvent(
        deps.projectId,
        deps.aggregationTopic || "aggregation-events",
        { eventId: event.eventId, tenantId: event.tenantId },
      );
      return;
    } catch (error) {
      deps.log?.("aggregation_event_publish_failed_falling_back_inline", {
        eventId: event.eventId,
        tenantId: event.tenantId,
        model: event.model,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  await processAggregationEventTransaction(
    {
      aggregationEventRepository: deps.metricRuntime.aggregationEventRepository,
      metricDefinitionRepository: deps.metricRuntime.metricDefinitionRepository,
      metricValueRepository: deps.metricRuntime.metricValueRepository,
      metricContributionRepository:
        deps.metricRuntime.metricContributionRepository,
      resolveQueryMembership: deps.metricRuntime.resolveQueryMembership,
    },
    input.tenantId,
    event.eventId,
    deps.log,
  );
}
