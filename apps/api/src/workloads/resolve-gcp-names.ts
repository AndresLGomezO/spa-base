/**
 * Derive a Cloud Scheduler job name from the Cloud Tasks queue name pattern.
 *
 * Examples:
 *   deriveSchedulerJobName("ai-jobs", "schedule-tick")       → "schedule-tick"
 *   deriveSchedulerJobName("es-ai-jobs-queue-dev", "schedule-tick") → "es-schedule-tick-dev"
 */
export function deriveSchedulerJobName(
  queueName: string,
  shortName: string,
): string {
  const m = queueName.match(/^(.*-)ai-jobs(?:-queue)?(-.*)?$/);
  if (m) return `${m[1]}${shortName}${m[2] ?? ""}`;
  return shortName;
}
