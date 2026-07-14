export const GMAIL_TASK_ROUTES = {
  WINDOW_SYNC: "/tasks/gmail-window-sync",
  WATCH_RENEW: "/tasks/gmail-watch-renew",
  PROCESS_MESSAGE: "/tasks/gmail-process-message",
} as const;

export type GmailWindowSyncTaskPayload = {
  readonly tenantId: string;
  readonly userId: string;
  readonly jobId: string;
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
  /** Prefer this binding when matching (binding catch-up). */
  readonly bindingId?: string;
};
