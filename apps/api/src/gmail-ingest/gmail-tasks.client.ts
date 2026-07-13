import {
  buildDeterministicTaskId,
  createCloudTasksClient,
  type CloudTasksClientConfig,
} from "../ai/cloud-tasks.client.js";
import {
  GMAIL_TASK_ROUTES,
  type GmailBackfillTaskPayload,
  type GmailHistorySyncTaskPayload,
  type GmailProcessMessageTaskPayload,
  type GmailWatchRenewTaskPayload,
} from "./gmail-task-routes.js";

export function createGmailTasksClient(config: CloudTasksClientConfig) {
  const cloudTasks = createCloudTasksClient(config);

  return {
    async enqueueBackfill(payload: GmailBackfillTaskPayload): Promise<void> {
      await cloudTasks.enqueueTask({
        path: GMAIL_TASK_ROUTES.BACKFILL,
        payload,
        taskId: buildDeterministicTaskId(
          "gmail-backfill",
          payload.jobId,
          `${payload.tenantId}:${payload.userId}:${payload.jobId}`,
        ),
      });
    },
    async enqueueHistorySync(
      payload: GmailHistorySyncTaskPayload,
    ): Promise<void> {
      await cloudTasks.enqueueTask({
        path: GMAIL_TASK_ROUTES.HISTORY_SYNC,
        payload,
        taskId: buildDeterministicTaskId(
          "gmail-history",
          payload.jobId,
          `${payload.tenantId}:${payload.userId}:${payload.jobId}`,
        ),
      });
    },
    async enqueueWatchRenew(
      payload: GmailWatchRenewTaskPayload,
      options?: { readonly scheduleTime?: Date },
    ): Promise<void> {
      const scheduleKey = options?.scheduleTime
        ? options.scheduleTime.toISOString()
        : "now";
      await cloudTasks.enqueueTask({
        path: GMAIL_TASK_ROUTES.WATCH_RENEW,
        payload,
        taskId: buildDeterministicTaskId(
          "gmail-watch",
          payload.userId,
          `${payload.userId}:${scheduleKey}`,
        ),
        ...(options?.scheduleTime
          ? { scheduleTime: options.scheduleTime }
          : {}),
      });
    },
    async enqueueProcessMessage(
      payload: GmailProcessMessageTaskPayload,
    ): Promise<void> {
      await cloudTasks.enqueueTask({
        path: GMAIL_TASK_ROUTES.PROCESS_MESSAGE,
        payload,
        taskId: buildDeterministicTaskId(
          "gmail-msg",
          payload.gmailMessageId,
          `${payload.tenantId}:${payload.userId}:${payload.gmailMessageId}:${payload.jobId}${payload.reprocess ? ":reprocess" : ""}`,
        ),
      });
    },
  };
}

export type GmailTasksClient = ReturnType<typeof createGmailTasksClient>;
