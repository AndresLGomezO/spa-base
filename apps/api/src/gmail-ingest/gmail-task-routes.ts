export const GMAIL_TASK_ROUTES = {
  BACKFILL: "/tasks/gmail-backfill",
  HISTORY_SYNC: "/tasks/gmail-history-sync",
  WATCH_RENEW: "/tasks/gmail-watch-renew",
  PROCESS_MESSAGE: "/tasks/gmail-process-message",
} as const;

export type GmailBackfillTaskPayload = {
  readonly tenantId: string;
  readonly userId: string;
  readonly jobId: string;
  readonly afterDate?: string;
  readonly beforeDate?: string;
  readonly maxMessages?: number;
};

export type GmailHistorySyncTaskPayload = {
  readonly tenantId: string;
  readonly userId: string;
  readonly jobId: string;
  readonly historyId?: string;
};

export type GmailWatchRenewTaskPayload = {
  readonly userId: string;
  readonly jobId?: string;
  readonly tenantId?: string;
};

export type GmailProcessMessageTaskPayload = {
  readonly tenantId: string;
  readonly userId: string;
  readonly jobId: string;
  readonly gmailMessageId: string;
};
