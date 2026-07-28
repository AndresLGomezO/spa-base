/**
 * Build a Google Cloud Console deep-link for a workload control-plane resource.
 * Returns null when the kind has no console page or required fields are missing.
 */
export function buildGcpConsoleUrl(options: {
  readonly resource: "queue" | "schedulerJob" | "subscription";
  readonly projectId: string;
  readonly region?: string;
  readonly resourceName: string;
}): string | null {
  const project = encodeURIComponent(options.projectId);
  const name = encodeURIComponent(options.resourceName);

  switch (options.resource) {
    case "queue": {
      if (!options.region) return null;
      const region = encodeURIComponent(options.region);
      return `https://console.cloud.google.com/cloudtasks/queue/${region}/${name}/tasks?project=${project}`;
    }
    case "schedulerJob": {
      if (!options.region) return null;
      const region = encodeURIComponent(options.region);
      return `https://console.cloud.google.com/cloudscheduler/jobs/edit/${region}/${name}?project=${project}`;
    }
    case "subscription":
      return `https://console.cloud.google.com/cloudpubsub/subscription/detail/${name}?project=${project}`;
    default:
      return null;
  }
}
