import { z } from "zod";

import {
  DATA_HOOK_EXECUTION_MODES,
  DATA_HOOK_JOB_OPERATIONS,
  DATA_HOOK_PHASES,
} from "./data-hook-definition.js";

export const DATA_HOOK_EXECUTIONS_COLLECTION =
  "__data_hook_executions" as const;

export const DATA_HOOK_EXECUTION_STATUSES = [
  "success",
  "error",
  "skipped",
] as const;
export type DataHookExecutionStatus =
  (typeof DATA_HOOK_EXECUTION_STATUSES)[number];

export const createDataHookExecutionInputSchema = z.object({
  hookId: z.string().trim().min(1),
  hookName: z.string().trim().min(1),
  entityName: z.string().trim().min(1),
  event: z.string().trim().min(1),
  phase: z.enum(DATA_HOOK_PHASES),
  operation: z.enum(
    DATA_HOOK_JOB_OPERATIONS as unknown as [
      (typeof DATA_HOOK_JOB_OPERATIONS)[number],
      ...(typeof DATA_HOOK_JOB_OPERATIONS)[number][],
    ],
  ),
  recordId: z.string().trim().min(1).optional(),
  executionMode: z.enum(DATA_HOOK_EXECUTION_MODES),
  status: z.enum(DATA_HOOK_EXECUTION_STATUSES),
  error: z.string().trim().optional(),
  durationMs: z.number().int().nonnegative(),
  triggeredBy: z.object({
    uid: z.string().trim().min(1),
  }),
  startedAt: z.string().trim().min(1),
  finishedAt: z.string().trim().min(1),
});
export type CreateDataHookExecutionInput = z.infer<
  typeof createDataHookExecutionInputSchema
>;

export const dataHookExecutionRecordSchema =
  createDataHookExecutionInputSchema.extend({
    id: z.string().trim().min(1),
    tenantId: z.string().trim().min(1),
  });
export type DataHookExecutionRecord = z.infer<
  typeof dataHookExecutionRecordSchema
>;
