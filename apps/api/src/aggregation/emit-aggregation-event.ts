import {
  buildAggregationEvent,
  type AggregationEventOperation,
} from "@repo/event-engine";
import {
  AGGREGATION_EVENTS_TOPIC,
  publishAggregationEventMessage,
} from "@repo/gcp-firebase";

import type { MetricRuntimeContext } from "./metric-runtime-context.js";

export interface AggregationEmitterDeps {
  readonly metricRuntime: MetricRuntimeContext;
  readonly publishToPubSub: boolean;
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
    await publishAggregationEventMessage(
      deps.projectId,
      deps.aggregationTopic || AGGREGATION_EVENTS_TOPIC,
      { eventId: event.eventId, tenantId: event.tenantId },
    );
    return;
  }

  const { processAggregationEventTransaction } =
    await import("./process-aggregation-event-transaction.js");
  await processAggregationEventTransaction(
    deps.metricRuntime,
    input.tenantId,
    event.eventId,
    deps.log,
  );
}
