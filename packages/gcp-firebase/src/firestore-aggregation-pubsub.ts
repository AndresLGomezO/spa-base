import { PubSub } from "@google-cloud/pubsub";
import type { AggregationEventMessage } from "@repo/event-engine";

export const AGGREGATION_EVENTS_TOPIC = "aggregation-events" as const;

export async function ensureAggregationEventsTopic(
  projectId: string,
  topicName: string = AGGREGATION_EVENTS_TOPIC,
): Promise<void> {
  const pubsub = new PubSub({ projectId });
  const topic = pubsub.topic(topicName);
  const [exists] = await topic.exists();
  if (!exists) {
    await pubsub.createTopic(topicName);
  }
}

export async function publishAggregationEventMessage(
  projectId: string,
  topicName: string,
  message: AggregationEventMessage,
): Promise<void> {
  await ensureAggregationEventsTopic(projectId, topicName);
  const pubsub = new PubSub({ projectId });
  const topic = pubsub.topic(topicName);
  await topic.publishMessage({ json: message });
}
