/**
 * Build a Cloud Logging deep-link filtered by workloadRunId.
 * Uses the Logs Explorer query syntax.
 */
export function buildCloudLoggingUrl(options: {
  readonly projectId: string;
  readonly workloadRunId: string;
  readonly since?: string;
  readonly until?: string;
}): string {
  const filter = [
    'resource.type="cloud_run_revision"',
    `jsonPayload.workloadRunId="${options.workloadRunId}"`,
  ].join("\n");

  const params = new URLSearchParams();
  params.set("query", filter);
  if (options.since) {
    params.set("startTime", options.since);
  }
  if (options.until) {
    params.set("endTime", options.until);
  }
  return `https://console.cloud.google.com/logs/query;${params.toString()}?project=${encodeURIComponent(options.projectId)}`;
}
