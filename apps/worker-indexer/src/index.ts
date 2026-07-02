/**
 * Subscribes to index-provisioning Pub/Sub messages and calls Firestore Admin createIndex.
 *
 * Env: GCP_PROJECT_ID, INDEX_PROVISIONING_TOPIC (default index-provisioning),
 *      INDEX_PROVISIONING_SUBSCRIPTION (default index-provisioning-worker)
 */
import {
  INDEX_PROVISIONING_TOPIC,
  configureIndexProvisioningQueue,
  createFirestoreIndexStatusStore,
  ensureFirestoreIndexes,
  initializeFirebaseAdmin,
  type IndexProvisioningMessage,
} from "@repo/gcp-firebase";

const projectId = process.env.GCP_PROJECT_ID?.trim();
const topicName =
  process.env.INDEX_PROVISIONING_TOPIC?.trim() ?? INDEX_PROVISIONING_TOPIC;
const subscriptionName =
  process.env.INDEX_PROVISIONING_SUBSCRIPTION?.trim() ?? `${topicName}-worker`;

if (!projectId) {
  console.error("GCP_PROJECT_ID is required.");
  process.exit(1);
}

const firebaseAdminConfig = {
  projectId,
  authEmulatorHost: process.env.FIREBASE_AUTH_EMULATOR_HOST,
  firestoreEmulatorHost: process.env.FIRESTORE_EMULATOR_HOST,
  storageEmulatorHost: process.env.FIREBASE_STORAGE_EMULATOR_HOST,
  storageEmulatorPublicHost: process.env.FIREBASE_STORAGE_EMULATOR_PUBLIC_HOST,
  storageBucket: process.env.GCP_STORAGE_BUCKET,
};

const INDEX_PROVISIONING_CONCURRENCY = Number.parseInt(
  process.env.INDEX_PROVISIONING_CONCURRENCY ?? "1",
  10,
);
const INDEX_PROVISIONING_BATCH_DELAY_MS = Number.parseInt(
  process.env.INDEX_PROVISIONING_BATCH_DELAY_MS ?? "400",
  10,
);

initializeFirebaseAdmin(firebaseAdminConfig);
configureIndexProvisioningQueue({
  concurrency: Number.isFinite(INDEX_PROVISIONING_CONCURRENCY)
    ? Math.max(1, INDEX_PROVISIONING_CONCURRENCY)
    : 1,
  batchDelayMs: Number.isFinite(INDEX_PROVISIONING_BATCH_DELAY_MS)
    ? Math.max(0, INDEX_PROVISIONING_BATCH_DELAY_MS)
    : 400,
});
const statusStore = createFirestoreIndexStatusStore(firebaseAdminConfig);

async function main(): Promise<void> {
  const { PubSub } = await import("@google-cloud/pubsub");
  const pubsub = new PubSub({ projectId });
  const topic = pubsub.topic(topicName);
  const [subscriptions] = await topic.getSubscriptions();
  let subscription = subscriptions.find((entry) =>
    entry.name.endsWith(`/subscriptions/${subscriptionName}`),
  );

  if (!subscription) {
    [subscription] = await topic.createSubscription(subscriptionName);
    console.log(`Created subscription ${subscriptionName}`);
  }

  console.log(
    `Listening on ${topicName} / ${subscriptionName} (project ${projectId})`,
  );

  subscription.on("message", (message) => {
    void (async () => {
      try {
        const payload = JSON.parse(
          message.data.toString(),
        ) as IndexProvisioningMessage;
        await ensureFirestoreIndexes([payload.index], {
          projectId: payload.projectId,
          statusStore,
        });
        message.ack();
      } catch (error) {
        console.error("Failed to provision index", error);
        message.nack();
      }
    })();
  });

  subscription.on("error", (error) => {
    console.error("Subscription error", error);
  });
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
