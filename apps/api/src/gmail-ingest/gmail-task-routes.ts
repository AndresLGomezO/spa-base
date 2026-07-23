export const GMAIL_TASK_ROUTES = {
  WINDOW_SYNC: "/tasks/gmail-window-sync",
  WATCH_RENEW: "/tasks/gmail-watch-renew",
  PROCESS_MESSAGE: "/tasks/gmail-process-message",
} as const;

export type GmailWindowSyncTaskPayload = {
  readonly tenantId: string;
  readonly userId: string;
  readonly jobId: string;
  /** When set, sync only this binding (catch-up style; does not advance watermark). */
  readonly bindingId?: string;
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
  /** Prefer / scope this binding when matching (binding Sync Now). */
  readonly bindingId?: string;
  /**
   * When true with bindingId, skip ingest dedup and run only that binding.
   * Used by binding Sync Now so new rules can apply to already-ingested mail.
   */
  readonly reprocess?: boolean;
};
