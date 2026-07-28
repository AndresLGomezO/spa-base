import { z } from "zod";

import { workloadRunRefSchema } from "@repo/workload-registry";

export const WORKLOAD_RUNS_COLLECTION = "__workload_runs" as const;

export const WORKLOAD_RUN_STATUSES = [
  "running",
  "success",
  "error",
  "timeout",
  "cancelled",
] as const;
export type WorkloadRunStatus = (typeof WORKLOAD_RUN_STATUSES)[number];

export const WORKLOAD_RUN_TRIGGERS = [
  "scheduler",
  "cloudTasks",
  "pubsub",
  "manual",
  "inProcess",
  "http",
] as const;
export type WorkloadRunTrigger = (typeof WORKLOAD_RUN_TRIGGERS)[number];

export const workloadRunTriggerContextSchema = z
  .object({
    schedulerJob: z.string().trim().min(1).optional(),
    cronFireTime: z.string().trim().min(1).optional(),
    taskName: z.string().trim().min(1).optional(),
    queueName: z.string().trim().min(1).optional(),
    retryCount: z.number().int().nonnegative().optional(),
    messageId: z.string().trim().min(1).optional(),
    ackId: z.string().trim().min(1).optional(),
    forced: z.boolean().optional(),
    actorUserId: z.string().trim().min(1).optional(),
    taskCategory: z.string().trim().min(1).optional(),
    route: z.string().trim().min(1).optional(),
  })
  .passthrough();
export type WorkloadRunTriggerContext = z.infer<
  typeof workloadRunTriggerContextSchema
>;

export const workloadRunErrorSchema = z.object({
  code: z.string().trim().min(1).optional(),
  message: z.string().trim().min(1),
  stack: z.string().optional(),
  retryable: z.boolean().optional(),
});
export type WorkloadRunError = z.infer<typeof workloadRunErrorSchema>;

export const createWorkloadRunInputSchema = z.object({
  id: z.string().trim().min(1),
  workloadId: z.string().trim().min(1),
  tenantId: z.string().trim().min(1).optional(),
  triggeredBy: z.enum(WORKLOAD_RUN_TRIGGERS),
  triggerContext: workloadRunTriggerContextSchema.default({}),
  startedAt: z.string().trim().min(1),
  status: z.enum(WORKLOAD_RUN_STATUSES).default("running"),
  parentRunId: z.string().trim().min(1).optional(),
  rootRunId: z.string().trim().min(1).optional(),
  metrics: z.record(z.string(), z.unknown()).default({}),
  artifactRefs: z.array(workloadRunRefSchema).default([]),
  cloudLoggingUrl: z.string().trim().min(1).optional(),
});
export type CreateWorkloadRunInput = z.infer<
  typeof createWorkloadRunInputSchema
>;

export const updateWorkloadRunPatchSchema = z.object({
  status: z.enum(WORKLOAD_RUN_STATUSES).optional(),
  completedAt: z.string().trim().min(1).optional(),
  durationMs: z.number().int().nonnegative().optional(),
  error: workloadRunErrorSchema.optional(),
  metrics: z.record(z.string(), z.unknown()).optional(),
  artifactRefs: z.array(workloadRunRefSchema).optional(),
  logExcerpt: z.array(z.string()).optional(),
  cloudLoggingUrl: z.string().trim().min(1).optional(),
});
export type UpdateWorkloadRunPatch = z.infer<
  typeof updateWorkloadRunPatchSchema
>;

export const workloadRunRecordSchema = createWorkloadRunInputSchema.extend({
  completedAt: z.string().trim().min(1).optional(),
  durationMs: z.number().int().nonnegative().optional(),
  error: workloadRunErrorSchema.optional(),
  logExcerpt: z.array(z.string()).optional(),
});
export type WorkloadRunRecord = z.infer<typeof workloadRunRecordSchema>;

/** HTTP headers used to propagate lineage across Cloud Tasks / worker boundaries. */
export const WORKLOAD_RUN_PARENT_HEADER = "X-Workload-Run-Parent-Id" as const;
export const WORKLOAD_RUN_ROOT_HEADER = "X-Workload-Run-Root-Id" as const;
