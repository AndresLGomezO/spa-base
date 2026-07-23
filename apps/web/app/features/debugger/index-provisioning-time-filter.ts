import type { IndexProvisioningJob } from "../../lib/api-client";

export function indexJobLastActivityAt(
  job: IndexProvisioningJob,
): string | null {
  let latest: string | null = null;
  for (const entry of job.log) {
    if (!latest || entry.timestamp.localeCompare(latest) > 0) {
      latest = entry.timestamp;
    }
  }
  return latest;
}

export function indexJobMatchesTimeBounds(
  job: IndexProvisioningJob,
  bounds: { readonly sinceIso: string; readonly untilIso: string },
): boolean {
  const lastActivityAt = indexJobLastActivityAt(job);
  if (!lastActivityAt) {
    return job.phase === "pending" || job.phase === "creating";
  }

  const activityMs = Date.parse(lastActivityAt);
  const sinceMs = Date.parse(bounds.sinceIso);
  const untilMs = Date.parse(bounds.untilIso);
  if (!Number.isFinite(activityMs)) {
    return job.phase === "pending" || job.phase === "creating";
  }
  if (Number.isFinite(sinceMs) && activityMs < sinceMs) {
    return false;
  }
  if (Number.isFinite(untilMs) && activityMs > untilMs) {
    return false;
  }
  return true;
}
