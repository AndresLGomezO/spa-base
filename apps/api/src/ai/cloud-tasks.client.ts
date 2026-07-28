import { createHash } from "node:crypto";

import type { CloudTasksClient as CloudTasksClientType } from "@google-cloud/tasks";
import {
  WORKLOAD_RUN_PARENT_HEADER,
  WORKLOAD_RUN_ROOT_HEADER,
} from "@repo/workload-runs";

export interface CloudTasksClientConfig {
  readonly projectId: string;
  readonly region: string;
  readonly queueName: string;
  readonly workerBaseUrl: string;
  readonly serviceAccountEmail?: string;
  readonly localDispatch: boolean;
}

let client: CloudTasksClientType | null = null;

async function getClient(): Promise<CloudTasksClientType> {
  if (!client) {
    const { CloudTasksClient } = await import("@google-cloud/tasks");
    client = new CloudTasksClient();
  }
  return client;
}

interface EnqueueOptions {
  readonly path: string;
  readonly payload: object;
  readonly taskId?: string;
  /** When set, Cloud Tasks runs the task at/after this time (local: delayed fetch). */
  readonly scheduleTime?: Date;
  /**
   * Cloud Tasks HTTP dispatch deadline in seconds (max 1800).
   * Use for long-running worker handlers that await completion.
   */
  readonly dispatchDeadlineSeconds?: number;
  readonly parentRunId?: string;
  readonly rootRunId?: string;
}

export function createCloudTasksClient(config: CloudTasksClientConfig) {
  return {
    async enqueueTask(options: EnqueueOptions): Promise<string> {
      if (config.localDispatch) {
        return enqueueLocal(config, options);
      }
      return enqueueCloudTask(config, options);
    },
  };
}

async function enqueueLocal(
  config: CloudTasksClientConfig,
  options: EnqueueOptions,
): Promise<string> {
  const lineageHeaders: Record<string, string> = {};
  if (options.parentRunId) {
    lineageHeaders[WORKLOAD_RUN_PARENT_HEADER] = options.parentRunId;
  }
  if (options.rootRunId) {
    lineageHeaders[WORKLOAD_RUN_ROOT_HEADER] = options.rootRunId;
  }

  const run = async () => {
    const url = `${config.workerBaseUrl}${options.path}`;
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Local-Task-Dispatcher": "true",
        ...lineageHeaders,
      },
      body: JSON.stringify(options.payload),
      // Worker accepts the task quickly (202) and processes async, like Cloud Tasks.
      signal: AbortSignal.timeout(10_000),
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(
        `Local worker request failed: ${response.status} ${response.statusText} ${body.slice(0, 500)}`,
      );
    }
  };

  if (options.scheduleTime) {
    const delayMs = Math.max(0, options.scheduleTime.getTime() - Date.now());
    const taskId = `local-scheduled-${Date.now()}`;
    setTimeout(
      () => {
        void run().catch((error: unknown) => {
          console.error(
            JSON.stringify({
              message: "Local scheduled Cloud Task dispatch failed",
              path: options.path,
              error: error instanceof Error ? error.message : String(error),
            }),
          );
        });
      },
      Math.min(delayMs, 2_147_483_647),
    );
    return taskId;
  }

  await run();
  return `local-${Date.now()}`;
}

async function enqueueCloudTask(
  config: CloudTasksClientConfig,
  options: EnqueueOptions,
): Promise<string> {
  const tasksClient = await getClient();
  const parent = tasksClient.queuePath(
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

  if (options.parentRunId) {
    httpRequest.headers[WORKLOAD_RUN_PARENT_HEADER] = options.parentRunId;
  }
  if (options.rootRunId) {
    httpRequest.headers[WORKLOAD_RUN_ROOT_HEADER] = options.rootRunId;
  }

  if (config.serviceAccountEmail) {
    httpRequest.oidcToken = {
      serviceAccountEmail: config.serviceAccountEmail,
    };
  }

  const task: {
    httpRequest: typeof httpRequest;
    name?: string;
    scheduleTime?: { seconds: number };
    dispatchDeadline?: { seconds: number };
  } = { httpRequest };

  if (options.taskId) {
    task.name = `${parent}/tasks/${options.taskId}`;
  }

  if (options.scheduleTime) {
    task.scheduleTime = {
      seconds: Math.floor(options.scheduleTime.getTime() / 1000),
    };
  }

  if (options.dispatchDeadlineSeconds != null) {
    const seconds = Math.min(
      1800,
      Math.max(15, Math.floor(options.dispatchDeadlineSeconds)),
    );
    task.dispatchDeadline = { seconds };
  }

  try {
    const [response] = await tasksClient.createTask({ parent, task });
    return response.name || task.name || "unknown";
  } catch (err: unknown) {
    if (isAlreadyExistsError(err)) {
      return task.name || "deduplicated";
    }
    throw err;
  }
}

function isAlreadyExistsError(err: unknown): boolean {
  return (
    err != null &&
    typeof err === "object" &&
    "code" in err &&
    (err as { code: number }).code === 6
  );
}

export function buildDeterministicTaskId(
  prefix: string,
  key: string,
  salt: string,
): string {
  const safeKey = key.replace(/[^A-Za-z0-9_-]/g, "_").slice(0, 200);
  const hash = createHash("sha256").update(salt).digest("hex").slice(0, 16);
  return `${prefix}-${safeKey}-${hash}`;
}
