import type { WorkloadRunRecorder } from "@repo/workload-runs";

import { withWorkloadRun } from "../workloads/with-workload-run.js";

// Matches Cloud Scheduler cadence in gmail-ingest.tf (every 5 minutes).
export const GMAIL_POLL_INTERVAL_MS = 5 * 60 * 1000;

export interface LocalGmailPollSchedulerOptions {
  readonly workerBaseUrl: string;
  readonly getDeliveryMode: () => Promise<"poll" | "push">;
  readonly intervalMs?: number;
  readonly fetchImpl?: typeof fetch;
  readonly log?: (entry: Record<string, unknown>) => void;
  readonly workloadRunRecorder?: WorkloadRunRecorder;
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
    const runTick = async (): Promise<void> => {
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
        throw error;
      }
    };

    if (!options.workloadRunRecorder) {
      try {
        await runTick();
      } catch {
        // Logged above; keep interval alive.
      }
      return;
    }

    try {
      await withWorkloadRun(
        options.workloadRunRecorder,
        {
          workloadId: "inprocess:local-gmail-poll",
          triggeredBy: "inProcess",
        },
        {
          info: (msg: string | Record<string, unknown>, ...args: unknown[]) =>
            log({
              message: typeof msg === "string" ? msg : "info",
              ...(typeof msg === "object" ? msg : {}),
              ...(typeof args[0] === "object" && args[0]
                ? (args[0] as Record<string, unknown>)
                : {}),
            }),
          error: (msg: string | Record<string, unknown>, ...args: unknown[]) =>
            log({
              message: typeof msg === "string" ? msg : "error",
              severity: "ERROR",
              ...(typeof msg === "object" ? msg : {}),
              ...(typeof args[0] === "object" && args[0]
                ? (args[0] as Record<string, unknown>)
                : {}),
            }),
          child: (bindings: Record<string, unknown>) => ({
            info: (msg: string | Record<string, unknown>, ...args: unknown[]) =>
              log({
                message: typeof msg === "string" ? msg : "info",
                ...bindings,
                ...(typeof msg === "object" ? msg : {}),
                ...(typeof args[0] === "object" && args[0]
                  ? (args[0] as Record<string, unknown>)
                  : {}),
              }),
            error: (
              msg: string | Record<string, unknown>,
              ...args: unknown[]
            ) =>
              log({
                message: typeof msg === "string" ? msg : "error",
                severity: "ERROR",
                ...bindings,
                ...(typeof msg === "object" ? msg : {}),
                ...(typeof args[0] === "object" && args[0]
                  ? (args[0] as Record<string, unknown>)
                  : {}),
              }),
          }),
        },
        async () => {
          await runTick();
        },
      );
    } catch {
      // Logged via withWorkloadRun / tick; keep interval alive.
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
