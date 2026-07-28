import type { CloudTasksClient as CloudTasksClientType } from "@google-cloud/tasks";

export interface CloudTasksAdminConfig {
  readonly projectId: string;
  readonly region: string;
  readonly localMode: boolean;
}

interface CloudTasksQueueState {
  readonly status: "ready" | "paused" | "unknown";
  readonly live: {
    depth?: number;
    oldestScheduleTime?: string;
    state?: string;
  };
  readonly error?: string;
}

interface PendingTask {
  readonly name: string;
  readonly scheduleTime?: string;
  readonly createTime?: string;
}

let client: CloudTasksClientType | null = null;

async function getClient(): Promise<CloudTasksClientType> {
  if (!client) {
    const { CloudTasksClient } = await import("@google-cloud/tasks");
    client = new CloudTasksClient();
  }
  return client;
}

export function createCloudTasksAdminAdapter(config: CloudTasksAdminConfig) {
  function queuePath(queueName: string): string {
    return `projects/${config.projectId}/locations/${config.region}/queues/${queueName}`;
  }

  return {
    async getState(queueName: string): Promise<CloudTasksQueueState> {
      if (config.localMode) {
        // Enabled locally, but not proof of in-flight work.
        return { status: "ready", live: { state: "RUNNING" } };
      }
      try {
        const tasksClient = await getClient();
        const [queue] = await tasksClient.getQueue({
          name: queuePath(queueName),
        });
        const state = queue.state as string | undefined;
        // GCP RUNNING = queue accepts tasks; not "work in flight".
        const status: "ready" | "paused" | "unknown" =
          state === "PAUSED"
            ? "paused"
            : state === "RUNNING"
              ? "ready"
              : "unknown";
        return { status, live: { state: state ?? undefined } };
      } catch (err) {
        return {
          status: "unknown",
          live: {},
          error: err instanceof Error ? err.message : String(err),
        };
      }
    },

    async pause(queueName: string): Promise<void> {
      if (config.localMode) {
        console.log(
          JSON.stringify({
            message: "localMode: would pause Cloud Tasks queue",
            queueName,
          }),
        );
        return;
      }
      const tasksClient = await getClient();
      await tasksClient.pauseQueue({ name: queuePath(queueName) });
    },

    async resume(queueName: string): Promise<void> {
      if (config.localMode) {
        console.log(
          JSON.stringify({
            message: "localMode: would resume Cloud Tasks queue",
            queueName,
          }),
        );
        return;
      }
      const tasksClient = await getClient();
      await tasksClient.resumeQueue({ name: queuePath(queueName) });
    },

    async listPendingTasks(
      queueName: string,
      limit = 20,
    ): Promise<PendingTask[]> {
      if (config.localMode) return [];
      try {
        const tasksClient = await getClient();
        const [tasks] = await tasksClient.listTasks({
          parent: queuePath(queueName),
          pageSize: limit,
        });
        return tasks.map((t) => ({
          name: t.name ?? "",
          scheduleTime: t.scheduleTime
            ? new Date(
                Number(
                  typeof t.scheduleTime === "object" && t.scheduleTime !== null
                    ? ((t.scheduleTime as { seconds?: number | string })
                        .seconds ?? 0)
                    : 0,
                ) * 1000,
              ).toISOString()
            : undefined,
          createTime: t.createTime
            ? new Date(
                Number(
                  typeof t.createTime === "object" && t.createTime !== null
                    ? ((t.createTime as { seconds?: number | string })
                        .seconds ?? 0)
                    : 0,
                ) * 1000,
              ).toISOString()
            : undefined,
        }));
      } catch {
        return [];
      }
    },
  };
}

export type CloudTasksAdminAdapter = ReturnType<
  typeof createCloudTasksAdminAdapter
>;
