/**
 * Derive a Cloud Scheduler job name from the Cloud Tasks queue name pattern.
 *
 * Examples:
 *   deriveSchedulerJobName("ai-jobs", "schedule-tick")       → "schedule-tick"
 *   deriveSchedulerJobName("es-ai-jobs-queue-dev", "schedule-tick") → "es-schedule-tick-dev"
 */
export function deriveSchedulerJobName(
  queueName: string | undefined,
  shortName: string,
): string {
  if (!queueName) return shortName;
  const m = queueName.match(/^(.*-)ai-jobs(?:-queue)?(-.*)?$/);
  if (m) return `${m[1]}${shortName}${m[2] ?? ""}`;
  return shortName;
}
