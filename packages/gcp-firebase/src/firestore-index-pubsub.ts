import type { FirestoreCompositeIndex } from "@repo/firestore-indexes";

export const INDEX_PROVISIONING_TOPIC = "index-provisioning" as const;

export interface IndexProvisioningMessage {
  readonly projectId: string;
  readonly index: FirestoreCompositeIndex;
}

export async function publishIndexProvisioningMessage(
  projectId: string,
  topicName: string,
  index: FirestoreCompositeIndex,
): Promise<void> {
  const { PubSub } = await import("@google-cloud/pubsub");
  const pubsub = new PubSub({ projectId });
  const topic = pubsub.topic(topicName);
  const payload: IndexProvisioningMessage = { projectId, index };
  await topic.publishMessage({ json: payload });
}
