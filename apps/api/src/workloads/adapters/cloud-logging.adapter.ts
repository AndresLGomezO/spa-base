import { buildCloudLoggingUrl } from "@repo/workload-runs";

interface CloudLoggingAdapterConfig {
  readonly projectId: string;
  readonly localMode: boolean;
  readonly enabled: boolean;
}

interface LogEntry {
  readonly timestamp: string;
  readonly severity: string;
  readonly message: string;
}

let loggingClient: unknown | null = null;

async function getClient(projectId: string) {
  if (!loggingClient) {
    const { Logging } = await import("@google-cloud/logging");
    loggingClient = new Logging({ projectId });
  }
  return loggingClient as {
    getEntries: (options: {
      filter: string;
      orderBy: string;
      pageSize: number;
    }) => Promise<
      [Array<{ metadata: Record<string, unknown>; data: unknown }>]
    >;
  };
}

export function createCloudLoggingAdapter(config: CloudLoggingAdapterConfig) {
  return {
    async listEntries(options: {
      workloadRunId: string;
      tail?: number;
      since?: string;
    }): Promise<LogEntry[]> {
      if (config.localMode || !config.enabled) return [];

      try {
        const client = await getClient(config.projectId);
        const filterParts = [
          'resource.type="cloud_run_revision"',
          `jsonPayload.workloadRunId="${options.workloadRunId}"`,
        ];
        if (options.since) {
          filterParts.push(`timestamp>="${options.since}"`);
        }

        const [entries] = await client.getEntries({
          filter: filterParts.join("\n"),
          orderBy: "timestamp desc",
          pageSize: options.tail ?? 100,
        });

        return entries.map((entry) => ({
          timestamp:
            (entry.metadata?.timestamp as string) ?? new Date().toISOString(),
          severity: (entry.metadata?.severity as string) ?? "DEFAULT",
          message:
            typeof entry.data === "string"
              ? entry.data
              : JSON.stringify(entry.data),
        }));
      } catch {
        return [];
      }
    },

    buildLogUrl(workloadRunId: string, since?: string, until?: string): string {
      return buildCloudLoggingUrl({
        projectId: config.projectId,
        workloadRunId,
        since,
        until,
      });
    },
  };
}

export type CloudLoggingAdapter = ReturnType<typeof createCloudLoggingAdapter>;
