import { createHash } from "node:crypto";

import type { CloudTasksClient as CloudTasksClientType } from "@google-cloud/tasks";

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
  const url = `${config.workerBaseUrl}${options.path}`;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Local-Task-Dispatcher": "true",
    },
    body: JSON.stringify(options.payload),
    signal: AbortSignal.timeout(30_000),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(
      `Local worker request failed: ${response.status} ${response.statusText} ${body.slice(0, 500)}`,
    );
  }

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

  if (config.serviceAccountEmail) {
    httpRequest.oidcToken = {
      serviceAccountEmail: config.serviceAccountEmail,
    };
  }

  const task: {
    httpRequest: typeof httpRequest;
    name?: string;
  } = { httpRequest };

  if (options.taskId) {
    task.name = `${parent}/tasks/${options.taskId}`;
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
