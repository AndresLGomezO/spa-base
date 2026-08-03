import type { ProcessDocumentExtractionTaskPayload } from "@repo/ai-engine/task-routes";
import { AI_TASK_ROUTES } from "@repo/ai-engine/task-routes";

import {
  buildDeterministicTaskId,
  createCloudTasksClient,
  type CloudTasksClientConfig,
} from "../ai/cloud-tasks.client.js";

export type EnqueueDocumentExtractionInput =
  ProcessDocumentExtractionTaskPayload;

export function createEnqueueDocumentExtraction(
  cloudTasksConfig: CloudTasksClientConfig,
) {
  const cloudTasks = createCloudTasksClient(cloudTasksConfig);

  return async function enqueueDocumentExtraction(
    payload: EnqueueDocumentExtractionInput,
  ): Promise<string> {
    return cloudTasks.enqueueTask({
      path: AI_TASK_ROUTES.PROCESS_DOCUMENT_EXTRACTION,
      payload,
      taskId: buildDeterministicTaskId(
        "doc-extract",
        `${payload.tenantId}:${payload.attachmentId}`,
        `${payload.tenantId}:${payload.attachmentId}:${payload.templateId ?? "auto"}:${payload.requestedBy ?? "system"}`,
      ),
    });
  };
}

/**
 * Platform helper: enqueue statement AI extraction when an attachment is a STATEMENT.
 * Safe to call fire-and-forget; swallows enqueue errors to the provided logger.
 */
export async function maybeEnqueueStatementExtraction(options: {
  readonly enqueue: (
    payload: EnqueueDocumentExtractionInput,
  ) => Promise<unknown>;
  readonly tenantId: string;
  readonly attachment: Record<string, unknown>;
  readonly requestedBy?: string;
  readonly templateId?: string;
  readonly onError?: (error: unknown) => void;
}): Promise<boolean> {
  const documentType = options.attachment.documentType;
  if (
    typeof documentType !== "string" ||
    documentType.trim().toUpperCase() !== "STATEMENT"
  ) {
    return false;
  }

  const attachmentId =
    typeof options.attachment.id === "string"
      ? options.attachment.id.trim()
      : "";
  if (!attachmentId) {
    return false;
  }

  try {
    await options.enqueue({
      tenantId: options.tenantId,
      attachmentId,
      ...(options.templateId ? { templateId: options.templateId } : {}),
      ...(options.requestedBy ? { requestedBy: options.requestedBy } : {}),
    });
    return true;
  } catch (error) {
    options.onError?.(error);
    return false;
  }
}
