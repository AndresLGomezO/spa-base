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
    ): Promise<void> {
      await cloudTasks.enqueueTask({
        path: GMAIL_TASK_ROUTES.WATCH_RENEW,
        payload,
        taskId: buildDeterministicTaskId(
          "gmail-watch",
          payload.userId,
          payload.userId,
        ),
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
          `${payload.tenantId}:${payload.userId}:${payload.gmailMessageId}`,
        ),
      });
    },
  };
}

export type GmailTasksClient = ReturnType<typeof createGmailTasksClient>;
