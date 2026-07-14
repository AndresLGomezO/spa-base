// Matches Cloud Scheduler cadence in gmail-ingest.tf (every 5 minutes).
export const GMAIL_POLL_INTERVAL_MS = 5 * 60 * 1000;

export interface LocalGmailPollSchedulerOptions {
  readonly workerBaseUrl: string;
  readonly getDeliveryMode: () => Promise<"poll" | "push">;
  readonly intervalMs?: number;
  readonly fetchImpl?: typeof fetch;
  readonly log?: (entry: Record<string, unknown>) => void;
}

/**
 * Local stand-in for Cloud Scheduler: ticks `/tasks/gmail-poll` when delivery
 * mode is poll. No-ops ticks while mode is push.
 */
export function startLocalGmailPollScheduler(
  options: LocalGmailPollSchedulerOptions,
): { readonly stop: () => void } {
  const intervalMs = options.intervalMs ?? GMAIL_POLL_INTERVAL_MS;
  const fetchImpl = options.fetchImpl ?? fetch;
  const log =
    options.log ??
    ((entry) => {
      console.log(JSON.stringify(entry));
    });

  const pollUrl = `${options.workerBaseUrl.replace(/\/$/, "")}/tasks/gmail-poll`;

  async function tick(): Promise<void> {
    const deliveryMode = await options.getDeliveryMode();
    if (deliveryMode !== "poll") {
      log({
        message: "Local Gmail poll tick skipped: delivery mode is not poll",
        deliveryMode,
      });
      return;
    }

    try {
      const response = await fetchImpl(pollUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Local-Task-Dispatcher": "true",
        },
        body: "{}",
        signal: AbortSignal.timeout(10_000),
      });
      if (!response.ok) {
        const body = await response.text();
        log({
          message: "Local Gmail poll tick failed",
          status: response.status,
          body: body.slice(0, 300),
        });
        return;
      }
      log({ message: "Local Gmail poll tick enqueued" });
    } catch (error) {
      log({
        message: "Local Gmail poll tick error",
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  log({
    message: "Local Gmail poll scheduler started",
    intervalMs,
    pollUrl,
  });

  const timer = setInterval(() => {
    void tick();
  }, intervalMs);

  // First tick after one interval (mirrors waiting for Scheduler); callers can
  // still Sync now / curl immediately.
  return {
    stop: () => {
      clearInterval(timer);
    },
  };
}
