import { createHash } from "node:crypto";

import type { CloudTasksClient as CloudTasksClientType } from "@google-cloud/tasks";
import { AI_TASK_ROUTES } from "@repo/ai-engine/task-routes";
import type { ProcessDocumentExtractionTaskPayload } from "@repo/ai-engine/task-routes";

export interface WorkerDocumentExtractionTasksConfig {
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
  config: WorkerDocumentExtractionTasksConfig,
  payload: ProcessDocumentExtractionTaskPayload,
): Promise<void> {
  const response = await fetch(
    `${config.workerBaseUrl}${AI_TASK_ROUTES.PROCESS_DOCUMENT_EXTRACTION}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Local-Task-Dispatcher": "true",
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(10_000),
    },
  );
  if (!response.ok) {
    const body = await response.text();
    throw new Error(
      `Local document extraction dispatch failed: ${response.status} ${body.slice(0, 300)}`,
    );
  }
}

/**
 * Enqueue document extraction from the worker (e.g. after Gmail STATEMENT import).
 */
export function createWorkerDocumentExtractionEnqueuer(
  config: WorkerDocumentExtractionTasksConfig,
) {
  return {
    async enqueueDocumentExtraction(
      payload: ProcessDocumentExtractionTaskPayload,
    ): Promise<void> {
      if (config.localDispatch) {
        // Fire-and-forget locally so Gmail ingest is not blocked on extraction.
        void enqueueLocal(config, payload).catch((error: unknown) => {
          console.error(
            JSON.stringify({
              message: "Local document extraction enqueue failed",
              attachmentId: payload.attachmentId,
              error: error instanceof Error ? error.message : String(error),
            }),
          );
        });
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
        url: `${config.workerBaseUrl}${AI_TASK_ROUTES.PROCESS_DOCUMENT_EXTRACTION}`,
        headers: { "Content-Type": "application/json" },
        body: Buffer.from(JSON.stringify(payload)).toString("base64"),
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
            name: `${parent}/tasks/${buildDeterministicTaskId(
              "doc-extract",
              `${payload.tenantId}:${payload.attachmentId}`,
              `${payload.tenantId}:${payload.attachmentId}:${payload.templateId ?? "auto"}`,
            )}`,
            httpRequest,
          },
        });
      } catch (err: unknown) {
        if (isAlreadyExistsError(err)) return;
        throw err;
      }
    },
  };
}
