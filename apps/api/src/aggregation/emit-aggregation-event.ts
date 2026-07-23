import {
  emitAggregationEventIfNeeded as emitShared,
  type AggregationEmitterDeps as SharedAggregationEmitterDeps,
} from "@repo/aggregation-engine";
import {
  AGGREGATION_EVENTS_TOPIC,
  publishAggregationEventMessage,
} from "@repo/gcp-firebase";

export type AggregationEmitterDeps = Omit<
  SharedAggregationEmitterDeps,
  "publishAggregationEvent"
> & {
  readonly publishAggregationEvent?: SharedAggregationEmitterDeps["publishAggregationEvent"];
};

export async function emitAggregationEventIfNeeded(
  deps: AggregationEmitterDeps,
  input: Parameters<typeof emitShared>[1],
): Promise<void> {
  await emitShared(
    {
      ...deps,
      aggregationTopic: deps.aggregationTopic || AGGREGATION_EVENTS_TOPIC,
      publishAggregationEvent:
        deps.publishAggregationEvent ?? publishAggregationEventMessage,
    },
    input,
  );
}
