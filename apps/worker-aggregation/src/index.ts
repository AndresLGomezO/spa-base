/**
 * Subscribes to aggregation-events Pub/Sub messages and processes metric deltas.
 */
import { createServer } from "node:http";

import type { Subscription } from "@google-cloud/pubsub";
import { aggregationEventMessageSchema } from "@repo/event-engine";
import { processAggregationEventTransaction } from "@repo/aggregation-engine";
import { initializeFirebaseAdmin } from "@repo/gcp-firebase/firebase-admin";
import { createFirestoreAdminAggregationEventRepository } from "@repo/gcp-firebase/firestore-admin-aggregation-event-repository";
import { createFirestoreAdminMetricContributionRepository } from "@repo/gcp-firebase/firestore-admin-metric-contribution-repository";
import { createFirestoreAdminMetricDefinitionRepository } from "@repo/gcp-firebase/firestore-admin-metric-definition-repository";
import { createFirestoreAdminMetricValueRepository } from "@repo/gcp-firebase/firestore-admin-metric-value-repository";
import {
  AGGREGATION_EVENTS_TOPIC,
  ensureAggregationEventsTopic,
} from "@repo/gcp-firebase/firestore-aggregation-pubsub";

const projectId = process.env.GCP_PROJECT_ID?.trim();
const topicName =
  process.env.AGGREGATION_EVENTS_TOPIC?.trim() ?? AGGREGATION_EVENTS_TOPIC;
const subscriptionName =
  process.env.AGGREGATION_EVENTS_SUBSCRIPTION?.trim() ?? `${topicName}-worker`;
const healthPort = Number.parseInt(process.env.PORT?.trim() ?? "8080", 10);
const usePubSubEmulator = Boolean(process.env.PUBSUB_EMULATOR_HOST?.trim());
const isManagedEnvironment =
  process.env.NODE_ENV === "production" && !usePubSubEmulator;

function requireProjectId(): string {
  if (!projectId) {
    console.error("GCP_PROJECT_ID is required.");
    process.exit(1);
  }
  return projectId;
}

const gcpProjectId = requireProjectId();

const firebaseAdminConfig = {
  projectId: gcpProjectId,
  authEmulatorHost: process.env.FIREBASE_AUTH_EMULATOR_HOST,
  firestoreEmulatorHost: process.env.FIRESTORE_EMULATOR_HOST,
  storageEmulatorHost: process.env.FIREBASE_STORAGE_EMULATOR_HOST,
  storageEmulatorPublicHost: process.env.FIREBASE_STORAGE_EMULATOR_PUBLIC_HOST,
  storageBucket: process.env.GCP_STORAGE_BUCKET,
};

initializeFirebaseAdmin(firebaseAdminConfig);

const deps = {
  metricDefinitionRepository:
    createFirestoreAdminMetricDefinitionRepository(firebaseAdminConfig),
  aggregationEventRepository:
    createFirestoreAdminAggregationEventRepository(firebaseAdminConfig),
  metricValueRepository:
    createFirestoreAdminMetricValueRepository(firebaseAdminConfig),
  metricContributionRepository:
    createFirestoreAdminMetricContributionRepository(firebaseAdminConfig),
};

function log(message: string, meta: Record<string, unknown>): void {
  console.log(JSON.stringify({ message, ...meta }));
}

function startHealthServer(): void {
  createServer((request, response) => {
    if (request.url === "/health") {
      response.writeHead(200, { "Content-Type": "application/json" });
      response.end(JSON.stringify({ status: "ok" }));
      return;
    }

    response.writeHead(404);
    response.end();
  }).listen(healthPort, "0.0.0.0", () => {
    console.log(`Health server listening on 0.0.0.0:${healthPort}`);
  });
}

async function resolveSubscription(): Promise<Subscription> {
  const { PubSub } = await import("@google-cloud/pubsub");
  const pubsub = new PubSub({ projectId: gcpProjectId });

  if (!isManagedEnvironment) {
    await ensureAggregationEventsTopic(gcpProjectId, topicName);
  }

  if (isManagedEnvironment) {
    const subscription = pubsub.subscription(subscriptionName);
    const [exists] = await subscription.exists();
    if (!exists) {
      throw new Error(
        `Subscription ${subscriptionName} not found. Provision it via Terraform before starting the worker.`,
      );
    }
    return subscription;
  }

  const topic = pubsub.topic(topicName);
  const [subscriptions] = await topic.getSubscriptions();
  let subscription = subscriptions.find((entry) =>
    entry.name.endsWith(`/subscriptions/${subscriptionName}`),
  );

  if (!subscription) {
    [subscription] = await topic.createSubscription(subscriptionName);
    console.log(`Created subscription ${subscriptionName}`);
  }

  return subscription;
}

async function main(): Promise<void> {
  startHealthServer();

  const subscription = await resolveSubscription();

  console.log(
    `Listening on ${topicName} / ${subscriptionName} (project ${gcpProjectId})`,
  );

  subscription.on("message", (message) => {
    void (async () => {
      try {
        const raw = JSON.parse(message.data.toString()) as unknown;
        const payload = aggregationEventMessageSchema.parse(raw);
        await processAggregationEventTransaction(
          deps,
          payload.tenantId,
          payload.eventId,
          log,
        );
        if (typeof message.ackWithResponse === "function") {
          await message.ackWithResponse();
        } else {
          message.ack();
        }
      } catch (error) {
        console.error("Failed to process aggregation event", error);
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
