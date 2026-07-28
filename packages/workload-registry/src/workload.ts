import { z } from "zod";

export const WORKLOAD_KINDS = [
  "cloudTasksQueue",
  "schedulerJob",
  "pubsubSubscription",
  "scheduledDataHook",
  "workerRoute",
  "inProcessScheduler",
] as const;
export type WorkloadKind = (typeof WORKLOAD_KINDS)[number];

export const WORKLOAD_SOURCES = ["system", "hook", "integration"] as const;
export type WorkloadSource = (typeof WORKLOAD_SOURCES)[number];

export const WORKLOAD_DOMAINS = [
  "ai",
  "email",
  "platform",
  "metrics",
  "tenant",
] as const;
export type WorkloadDomain = (typeof WORKLOAD_DOMAINS)[number];

export const WORKLOAD_STATUSES = [
  "running",
  "ready",
  "paused",
  "disabled",
  "unknown",
] as const;
export type WorkloadStatus = (typeof WORKLOAD_STATUSES)[number];

export const WORKLOAD_ACTIONS = [
  "pause",
  "resume",
  "runNow",
  "enable",
  "disable",
] as const;
export type WorkloadAction = (typeof WORKLOAD_ACTIONS)[number];

export const workloadGcpRefSchema = z.object({
  resource: z.enum(["queue", "schedulerJob", "subscription", "topic"]),
  /** Env key that holds the live resource name (e.g. HOOK_TASKS_QUEUE_NAME). */
  envKey: z.string().trim().min(1).optional(),
  /** Literal resource name when not driven by env (e.g. subscription id). */
  resourceName: z.string().trim().min(1).optional(),
  /** Terraform file that provisions this resource. */
  terraformFile: z.string().trim().min(1).optional(),
});
export type WorkloadGcpRef = z.infer<typeof workloadGcpRefSchema>;

export const workloadScheduleSchema = z.object({
  cron: z.string().trim().min(1),
  timezone: z.string().trim().min(1).optional(),
});
export type WorkloadSchedule = z.infer<typeof workloadScheduleSchema>;

export const workloadRecordSchema = z.object({
  id: z.string().trim().min(1),
  kind: z.enum(WORKLOAD_KINDS),
  source: z.enum(WORKLOAD_SOURCES),
  domain: z.enum(WORKLOAD_DOMAINS),
  displayName: z.string().trim().min(1),
  description: z.string().trim().min(1),
  actions: z.array(z.enum(WORKLOAD_ACTIONS)),
  gcp: workloadGcpRefSchema.optional(),
  /** Cron schedule when the workload is time-driven. */
  schedule: workloadScheduleSchema.optional(),
  /** Worker HTTP route when kind is workerRoute. */
  route: z.string().trim().min(1).optional(),
  /** Source file path for in-process schedulers / worker routes. */
  sourceFile: z.string().trim().min(1).optional(),
  /** How to disable when no runtime action exists. */
  disableHint: z.string().trim().min(1).optional(),
  /** Related upstream workload ids (e.g. worker route → its queue). */
  controlledBy: z.array(z.string().trim().min(1)).optional(),
  /**
   * For scheduled data hooks: whether the hook definition is enabled.
   * Used to derive Active (running) vs disabled for armed timers.
   */
  enabled: z.boolean().optional(),
});
export type WorkloadRecord = z.infer<typeof workloadRecordSchema>;

export const workloadStateSnapshotSchema = z.object({
  status: z.enum(WORKLOAD_STATUSES),
  /** Kind-dependent live stats (queue depth, next run, backlog, etc.). */
  live: z.record(z.string(), z.unknown()).default({}),
  /** When live state was fetched. */
  fetchedAt: z.string().trim().min(1),
  /** Soft error when live fetch failed (status usually "unknown"). */
  error: z.string().trim().min(1).optional(),
});
export type WorkloadStateSnapshot = z.infer<typeof workloadStateSnapshotSchema>;

export const workloadWithStateSchema = workloadRecordSchema.extend({
  state: workloadStateSnapshotSchema,
});
export type WorkloadWithState = z.infer<typeof workloadWithStateSchema>;

export const workloadRunRefSchema = z.object({
  kind: z.enum([
    "hookExecution",
    "aiJob",
    "emailIngestJob",
    "tenantDeletionJob",
    "workloadRun",
  ]),
  id: z.string().trim().min(1),
  tenantId: z.string().trim().min(1).optional(),
  status: z.string().trim().min(1).optional(),
});
export type WorkloadRunRef = z.infer<typeof workloadRunRefSchema>;
