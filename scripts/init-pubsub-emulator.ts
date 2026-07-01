/**
 * Idempotently creates Pub/Sub topics required for local emulator development.
 *
 * Usage:
 *   PUBSUB_EMULATOR_HOST=127.0.0.1:8085 GCP_PROJECT_ID=demo-project-base pnpm tsx scripts/init-pubsub-emulator.ts
 */
import {
  AGGREGATION_EVENTS_TOPIC,
  ensureAggregationEventsTopic,
} from "@repo/gcp-firebase/firestore-aggregation-pubsub";

const projectId = process.env.GCP_PROJECT_ID?.trim();
const pubsubHost = process.env.PUBSUB_EMULATOR_HOST?.trim();
const topicName =
  process.env.AGGREGATION_EVENTS_TOPIC?.trim() ?? AGGREGATION_EVENTS_TOPIC;

if (!projectId || !pubsubHost) {
  console.error("GCP_PROJECT_ID and PUBSUB_EMULATOR_HOST are required.");
  process.exit(1);
}

async function main(): Promise<void> {
  await ensureAggregationEventsTopic(projectId, topicName);
  console.log(
    JSON.stringify({
      message: "pubsub_emulator_initialized",
      projectId,
      pubsubHost,
      topicName,
    }),
  );
}

main().catch((error: unknown) => {
  console.error("Failed to initialize Pub/Sub emulator topics", error);
  process.exit(1);
});
