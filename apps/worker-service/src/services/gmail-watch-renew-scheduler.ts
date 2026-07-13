import { createHash } from "node:crypto";

import type { CloudTasksClient as CloudTasksClientType } from "@google-cloud/tasks";

const WATCH_RENEW_PATH = "/tasks/gmail-watch-renew";

export interface ScheduleGmailWatchRenewConfig {
  readonly projectId: string;
  readonly region: string;
  readonly queueName: string;
  readonly workerBaseUrl: string;
  readonly serviceAccountEmail?: string;
  readonly localDispatch: boolean;
}

let tasksClient: CloudTasksClientType | null = null;

async function getTasksClient(): Promise<CloudTasksClientType> {
  if (!tasksClient) {
    const { CloudTasksClient } = await import("@google-cloud/tasks");
    tasksClient = new CloudTasksClient();
  }
  return tasksClient;
}

function buildTaskId(userId: string, scheduleTime: Date): string {
  const safeKey = userId.replace(/[^A-Za-z0-9_-]/g, "_").slice(0, 200);
  const hash = createHash("sha256")
    .update(`${userId}:${scheduleTime.toISOString()}`)
    .digest("hex")
    .slice(0, 16);
  return `gmail-watch-${safeKey}-${hash}`;
}

/**
 * Schedule a Gmail watch renew task (local delayed fetch or Cloud Tasks scheduleTime).
 * Mirrors the API gmail-tasks client so the worker can self-chain renewals.
 */
export function createScheduleGmailWatchRenew(
  config: ScheduleGmailWatchRenewConfig,
): (payload: {
  readonly userId: string;
  readonly tenantId?: string;
  readonly scheduleTime: Date;
}) => Promise<void> {
  return async (payload) => {
    const body = {
      userId: payload.userId,
      ...(payload.tenantId ? { tenantId: payload.tenantId } : {}),
    };

    if (config.localDispatch) {
      const delayMs = Math.max(0, payload.scheduleTime.getTime() - Date.now());
      setTimeout(
        () => {
          void fetch(`${config.workerBaseUrl}${WATCH_RENEW_PATH}`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-Local-Task-Dispatcher": "true",
            },
            body: JSON.stringify(body),
            signal: AbortSignal.timeout(10_000),
          }).catch((error: unknown) => {
            console.error(
              JSON.stringify({
                message: "Local Gmail watch renew schedule failed",
                error: error instanceof Error ? error.message : String(error),
              }),
            );
          });
        },
        Math.min(delayMs, 2_147_483_647),
      );
      return;
    }

    const client = await getTasksClient();
    const parent = client.queuePath(
      config.projectId,
      config.region,
      config.queueName,
    );
    const httpRequest: {
      httpMethod: "POST";
      url: string;
      headers: Record<string, string>;
      body: string;
      oidcToken?: { serviceAccountEmail: string };
    } = {
      httpMethod: "POST",
      url: `${config.workerBaseUrl}${WATCH_RENEW_PATH}`,
      headers: { "Content-Type": "application/json" },
      body: Buffer.from(JSON.stringify(body)).toString("base64"),
    };
    if (config.serviceAccountEmail) {
      httpRequest.oidcToken = {
        serviceAccountEmail: config.serviceAccountEmail,
      };
    }

    const taskName = `${parent}/tasks/${buildTaskId(payload.userId, payload.scheduleTime)}`;
    try {
      await client.createTask({
        parent,
        task: {
          name: taskName,
          httpRequest,
          scheduleTime: {
            seconds: Math.floor(payload.scheduleTime.getTime() / 1000),
          },
        },
      });
    } catch (err: unknown) {
      if (
        err != null &&
        typeof err === "object" &&
        "code" in err &&
        (err as { code: number }).code === 6
      ) {
        return;
      }
      throw err;
    }
  };
}
