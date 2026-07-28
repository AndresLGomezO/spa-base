/**
 * Build a Cloud Logging deep-link filtered by workloadRunId.
 * Logs Explorer uses semicolon-separated path params (not &-joined query params).
 * @see https://console.cloud.google.com/logs/query
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

  const parts = [`query=${encodeURIComponent(filter)}`];
  if (options.since) {
    parts.push(`startTime=${encodeURIComponent(options.since)}`);
  }
  if (options.until) {
    parts.push(`endTime=${encodeURIComponent(options.until)}`);
  }

  return `https://console.cloud.google.com/logs/query;${parts.join(";")}?project=${encodeURIComponent(options.projectId)}`;
}
