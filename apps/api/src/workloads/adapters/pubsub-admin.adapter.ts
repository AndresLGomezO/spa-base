import { PubSub } from "@google-cloud/pubsub";

interface PubSubAdminConfig {
  readonly projectId: string;
  readonly localMode: boolean;
  readonly subscriptionTopicMap?: Record<string, string>;
}

interface PubSubSubscriptionState {
  readonly status: "running" | "paused" | "unknown";
  readonly live: {
    exists?: boolean;
    pushEndpoint?: string;
    detached?: boolean;
  };
  readonly error?: string;
}

let pubsubClient: PubSub | null = null;

function getClient(projectId: string): PubSub {
  if (!pubsubClient) {
    pubsubClient = new PubSub({ projectId });
  }
  return pubsubClient;
}

export function createPubSubAdminAdapter(config: PubSubAdminConfig) {
  return {
    async getState(subscriptionName: string): Promise<PubSubSubscriptionState> {
      if (config.localMode) {
        // Attached listener = Active locally.
        return { status: "running", live: { exists: true } };
      }
      try {
        const client = getClient(config.projectId);
        const sub = client.subscription(subscriptionName);
        const [metadata] = await sub.getMetadata();
        const detached =
          (metadata as Record<string, unknown>).detached === true;
        const pushEndpoint =
          (metadata.pushConfig as { pushEndpoint?: string } | null | undefined)
            ?.pushEndpoint ?? undefined;
        // Attached = live listener (Active). Product gates may still disable.
        const status: "running" | "paused" | "unknown" = detached
          ? "paused"
          : "running";
        return {
          status,
          live: { exists: true, pushEndpoint, detached },
        };
      } catch (err) {
        return {
          status: "unknown",
          live: { exists: false },
          error: err instanceof Error ? err.message : String(err),
        };
      }
    },

    async pause(subscriptionName: string): Promise<void> {
      if (config.localMode) {
        console.log(
          JSON.stringify({
            message: "localMode: would pause subscription",
            subscriptionName,
          }),
        );
        return;
      }
      const client = getClient(config.projectId);
      try {
        await client.detachSubscription(subscriptionName);
      } catch (err) {
        console.log(
          JSON.stringify({
            message:
              "Could not detach subscription (may require recreate via Terraform)",
            subscriptionName,
            error: err instanceof Error ? err.message : String(err),
          }),
        );
      }
    },

    async resume(subscriptionName: string): Promise<void> {
      if (config.localMode) {
        console.log(
          JSON.stringify({
            message: "localMode: would resume subscription",
            subscriptionName,
          }),
        );
        return;
      }
      const topicName = config.subscriptionTopicMap?.[subscriptionName];
      if (!topicName) {
        throw new Error(
          `Cannot resume subscription "${subscriptionName}": no topic mapping configured. Recreate via Terraform.`,
        );
      }
      const client = getClient(config.projectId);
      const topic = client.topic(topicName);
      try {
        await topic.createSubscription(subscriptionName);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        if (message.includes("ALREADY_EXISTS")) return;
        throw err;
      }
    },
  };
}

export type PubSubAdminAdapter = ReturnType<typeof createPubSubAdminAdapter>;
