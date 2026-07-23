import { createHash } from "node:crypto";

import type { CloudTasksClient as CloudTasksClientType } from "@google-cloud/tasks";

import { createAsyncSemaphore } from "../lib/async-semaphore.js";

export interface WorkerGmailTasksConfig {
  readonly projectId: string;
  readonly region: string;
  readonly queueName: string;
  readonly workerBaseUrl: string;
  readonly serviceAccountEmail?: string;
  readonly localDispatch: boolean;
}

export type GmailProcessMessageEnqueuePayload = {
  readonly tenantId: string;
  readonly userId: string;
  readonly jobId: string;
  readonly gmailMessageId: string;
  readonly bindingId?: string;
  readonly reprocess?: boolean;
};

export type GmailWindowSyncEnqueuePayload = {
  readonly tenantId: string;
  readonly userId: string;
  readonly jobId: string;
  readonly bindingId?: string;
};

/** Local process-message can run hooks + aggregations; allow a long wait. */
const LOCAL_PROCESS_MESSAGE_TIMEOUT_MS = 10 * 60 * 1000;
const LOCAL_DEFAULT_TIMEOUT_MS = 10_000;

/**
 * Cap in-flight local process-message HTTP calls. Combined with the route
 * awaiting completion, window-sync gets a real FIFO queue instead of 202 fan-out.
 */
const localProcessMessageGate = createAsyncSemaphore(1);

let tasksClient: CloudTasksClientType | null = null;

async function getTasksClient(): Promise<CloudTasksClientType> {
  if (!tasksClient) {
    const { CloudTasksClient } = await import("@google-cloud/tasks");
    tasksClient = new CloudTasksClient();
  }
  return tasksClient;
}

function buildDeterministicTaskId(
  prefix: string,
  key: string,
  salt: string,
): string {
  const safeKey = key.replace(/[^A-Za-z0-9_-]/g, "_").slice(0, 200);
  const hash = createHash("sha256").update(salt).digest("hex").slice(0, 16);
  return `${prefix}-${safeKey}-${hash}`;
}

function isAlreadyExistsError(err: unknown): boolean {
  return (
    err != null &&
    typeof err === "object" &&
    "code" in err &&
    (err as { code: number }).code === 6
  );
}

async function enqueueLocal(
  config: WorkerGmailTasksConfig,
  path: string,
  payload: object,
  timeoutMs: number = LOCAL_DEFAULT_TIMEOUT_MS,
): Promise<void> {
  const response = await fetch(`${config.workerBaseUrl}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Local-Task-Dispatcher": "true",
    },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!response.ok) {
    const body = await response.text();
    throw new Error(
      `Local Gmail task dispatch failed: ${response.status} ${body.slice(0, 300)}`,
    );
  }
}

async function enqueueCloudTask(
  config: WorkerGmailTasksConfig,
  options: {
    readonly path: string;
    readonly payload: object;
    readonly taskId: string;
    readonly scheduleTime?: Date;
  },
): Promise<void> {
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
    url: `${config.workerBaseUrl}${options.path}`,
    headers: { "Content-Type": "application/json" },
    body: Buffer.from(JSON.stringify(options.payload)).toString("base64"),
  };
  if (config.serviceAccountEmail) {
    httpRequest.oidcToken = {
      serviceAccountEmail: config.serviceAccountEmail,
    };
  }

  try {
    await client.createTask({
      parent,
      task: {
        name: `${parent}/tasks/${options.taskId}`,
        httpRequest,
        ...(options.scheduleTime
          ? {
              scheduleTime: {
                seconds: Math.floor(options.scheduleTime.getTime() / 1000),
              },
            }
          : {}),
      },
    });
  } catch (err: unknown) {
    if (isAlreadyExistsError(err)) return;
    throw err;
  }
}

/**
 * Enqueue Gmail follow-up tasks from the worker.
 * Production must use Cloud Tasks + OIDC — Cloud Run rejects unauthenticated
 * self-fetches with a 404.
 *
 * Local process-message uses a concurrency-1 HTTP queue and awaits worker
 * completion so window sync cannot stampede the Firestore emulator.
 */
export function createWorkerGmailTaskEnqueuer(config: WorkerGmailTasksConfig) {
  return {
    async enqueueProcessMessage(
      payload: GmailProcessMessageEnqueuePayload,
    ): Promise<void> {
      const path = "/tasks/gmail-process-message";
      if (config.localDispatch) {
        // Schedule onto the paced queue and return immediately so window-sync
        // can finish. The gate + route awaitCompletion keep drain serial.
        void localProcessMessageGate
          .run(() =>
            enqueueLocal(
              config,
              path,
              payload,
              LOCAL_PROCESS_MESSAGE_TIMEOUT_MS,
            ),
          )
          .catch((error: unknown) => {
            console.error(
              JSON.stringify({
                message: "Local Gmail process-message queue failed",
                gmailMessageId: payload.gmailMessageId,
                jobId: payload.jobId,
                error: error instanceof Error ? error.message : String(error),
              }),
            );
          });
        return;
      }
      await enqueueCloudTask(config, {
        path,
        payload,
        taskId: buildDeterministicTaskId(
          "gmail-msg",
          payload.gmailMessageId,
          `${payload.tenantId}:${payload.userId}:${payload.gmailMessageId}:${payload.jobId}`,
        ),
      });
    },

    async enqueueWindowSync(
      payload: GmailWindowSyncEnqueuePayload,
    ): Promise<void> {
      const path = "/tasks/gmail-window-sync";
      if (config.localDispatch) {
        await enqueueLocal(config, path, payload);
        return;
      }
      await enqueueCloudTask(config, {
        path,
        payload,
        taskId: buildDeterministicTaskId(
          "gmail-window",
          payload.jobId,
          `${payload.tenantId}:${payload.userId}:${payload.jobId}`,
        ),
      });
    },

    async scheduleWatchRenew(payload: {
      readonly userId: string;
      readonly tenantId?: string;
      readonly scheduleTime: Date;
    }): Promise<void> {
      const path = "/tasks/gmail-watch-renew";
      const body = {
        userId: payload.userId,
        ...(payload.tenantId ? { tenantId: payload.tenantId } : {}),
      };

      if (config.localDispatch) {
        const delayMs = Math.max(
          0,
          payload.scheduleTime.getTime() - Date.now(),
        );
        setTimeout(
          () => {
            void enqueueLocal(config, path, body).catch((error: unknown) => {
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

      await enqueueCloudTask(config, {
        path,
        payload: body,
        taskId: buildDeterministicTaskId(
          "gmail-watch",
          payload.userId,
          `${payload.userId}:${payload.scheduleTime.toISOString()}`,
        ),
        scheduleTime: payload.scheduleTime,
      });
    },
  };
}
