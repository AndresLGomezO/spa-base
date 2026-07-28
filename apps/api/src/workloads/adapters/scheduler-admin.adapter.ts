interface SchedulerAdminConfig {
  readonly projectId: string;
  readonly region: string;
  readonly localMode: boolean;
}

interface SchedulerJobState {
  readonly status: "running" | "paused" | "unknown";
  readonly live: {
    state?: string;
    schedule?: string;
    nextRunTime?: string;
    lastAttemptTime?: string;
  };
  readonly error?: string;
}

let schedulerClient: unknown | null = null;

async function getClient(): Promise<{
  getJob: (req: { name: string }) => Promise<[Record<string, unknown>]>;
  pauseJob: (req: { name: string }) => Promise<void>;
  resumeJob: (req: { name: string }) => Promise<void>;
  runJob: (req: { name: string }) => Promise<void>;
}> {
  if (!schedulerClient) {
    const mod = await import("@google-cloud/scheduler");
    const Ctor =
      (mod as unknown as { CloudSchedulerClient: new () => unknown })
        .CloudSchedulerClient ??
      (
        mod as unknown as {
          default: { CloudSchedulerClient: new () => unknown };
        }
      ).default?.CloudSchedulerClient ??
      (mod as unknown as { v1: { CloudSchedulerClient: new () => unknown } }).v1
        ?.CloudSchedulerClient;
    if (!Ctor) throw new Error("Could not resolve CloudSchedulerClient");
    schedulerClient = new Ctor();
  }
  return schedulerClient as ReturnType<typeof getClient> extends Promise<
    infer T
  >
    ? T
    : never;
}

function timestampToIso(ts: unknown): string | undefined {
  if (!ts || typeof ts !== "object") return undefined;
  const seconds = (ts as { seconds?: number | string }).seconds;
  if (seconds == null) return undefined;
  return new Date(Number(seconds) * 1000).toISOString();
}

export function createSchedulerAdminAdapter(config: SchedulerAdminConfig) {
  function jobPath(jobName: string): string {
    return `projects/${config.projectId}/locations/${config.region}/jobs/${jobName}`;
  }

  return {
    async getState(jobName: string): Promise<SchedulerJobState> {
      if (config.localMode) {
        // Armed timer is Active locally (countdown from cron).
        return { status: "running", live: { state: "ENABLED" } };
      }
      try {
        const client = await getClient();
        const [job] = await client.getJob({ name: jobPath(jobName) });
        const state = job.state as string | undefined;
        // ENABLED = live timer (Active). Busy/in-flight is layered in the controller.
        const status: "running" | "paused" | "unknown" =
          state === "PAUSED"
            ? "paused"
            : state === "ENABLED"
              ? "running"
              : "unknown";
        return {
          status,
          live: {
            state: state ?? undefined,
            schedule: job.schedule as string | undefined,
            nextRunTime: timestampToIso(job.scheduleTime ?? job.nextRunTime),
            lastAttemptTime: timestampToIso(job.lastAttemptTime),
          },
        };
      } catch (err) {
        return {
          status: "unknown",
          live: {},
          error: err instanceof Error ? err.message : String(err),
        };
      }
    },

    async pause(jobName: string): Promise<void> {
      if (config.localMode) {
        console.log(
          JSON.stringify({
            message: "localMode: would pause scheduler job",
            jobName,
          }),
        );
        return;
      }
      const client = await getClient();
      await client.pauseJob({ name: jobPath(jobName) });
    },

    async resume(jobName: string): Promise<void> {
      if (config.localMode) {
        console.log(
          JSON.stringify({
            message: "localMode: would resume scheduler job",
            jobName,
          }),
        );
        return;
      }
      const client = await getClient();
      await client.resumeJob({ name: jobPath(jobName) });
    },

    async runNow(jobName: string): Promise<void> {
      if (config.localMode) {
        console.log(
          JSON.stringify({
            message: "localMode: would run scheduler job now",
            jobName,
          }),
        );
        return;
      }
      const client = await getClient();
      await client.runJob({ name: jobPath(jobName) });
    },
  };
}

export type SchedulerAdminAdapter = ReturnType<
  typeof createSchedulerAdminAdapter
>;
