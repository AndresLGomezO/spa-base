import { z } from "zod";

import {
  DATA_HOOK_EXECUTION_MODES,
  DATA_HOOK_JOB_OPERATIONS,
  DATA_HOOK_PHASES,
} from "./data-hook-definition.js";
import { dataHookExecutionMetricsSchema } from "./hook-execution-metrics.js";
import type { DataHookExecutionMetrics } from "./hook-execution-metrics.js";

export const DATA_HOOK_EXECUTIONS_COLLECTION =
  "__data_hook_executions" as const;

export const DATA_HOOK_EXECUTION_STATUSES = [
  "pending",
  "running",
  "success",
  "error",
  "skipped",
] as const;
export type DataHookExecutionStatus =
  (typeof DATA_HOOK_EXECUTION_STATUSES)[number];

export const DATA_HOOK_EXECUTION_TERMINAL_STATUSES = [
  "success",
  "error",
  "skipped",
] as const;
export type DataHookExecutionTerminalStatus =
  (typeof DATA_HOOK_EXECUTION_TERMINAL_STATUSES)[number];

export const DATA_HOOK_EXECUTION_ACTIVE_STATUSES = [
  "pending",
  "running",
] as const;
export type DataHookExecutionActiveStatus =
  (typeof DATA_HOOK_EXECUTION_ACTIVE_STATUSES)[number];

const dataHookExecutionBaseFieldsSchema = z
  .object({
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
    /** Email ledger row id when this execution was driven by email ingest. */
    emailLedgerId: z.string().trim().min(1).optional(),
    executionMode: z.enum(DATA_HOOK_EXECUTION_MODES),
    chainDepth: z.number().int().nonnegative().optional(),
    triggeredBy: z.object({
      uid: z.string().trim().min(1),
    }),
    startedAt: z.string().trim().min(1),
  })
  .merge(dataHookExecutionMetricsSchema);

export type DataHookExecutionBaseFields = z.infer<
  typeof dataHookExecutionBaseFieldsSchema
>;

export const createDataHookExecutionInputSchema =
  dataHookExecutionBaseFieldsSchema.extend({
    status: z.enum(DATA_HOOK_EXECUTION_STATUSES),
    error: z.string().trim().optional(),
    durationMs: z.number().int().nonnegative().optional(),
    finishedAt: z.string().trim().min(1).optional(),
  });
export type CreateDataHookExecutionInput = z.infer<
  typeof createDataHookExecutionInputSchema
>;

export const updateDataHookExecutionPatchSchema = z
  .object({
    status: z.enum(DATA_HOOK_EXECUTION_STATUSES).optional(),
    error: z.string().trim().optional(),
    durationMs: z.number().int().nonnegative().optional(),
    startedAt: z.string().trim().min(1).optional(),
    finishedAt: z.string().trim().min(1).optional(),
  })
  .merge(dataHookExecutionMetricsSchema);
export type UpdateDataHookExecutionPatch = z.infer<
  typeof updateDataHookExecutionPatchSchema
>;

export const dataHookExecutionRecordSchema =
  createDataHookExecutionInputSchema.extend({
    id: z.string().trim().min(1),
    tenantId: z.string().trim().min(1),
  });
export type DataHookExecutionRecord = z.infer<
  typeof dataHookExecutionRecordSchema
>;

export interface DataHookExecutionRecorder {
  createPending(
    input: DataHookExecutionBaseFields,
  ): Promise<{ readonly id: string }>;
  markRunning(executionId: string): Promise<void>;
  beginRunning(
    input: DataHookExecutionBaseFields,
    executionId?: string,
  ): Promise<{ readonly id: string }>;
  finish(
    input: {
      readonly id: string;
      readonly status: DataHookExecutionTerminalStatus;
      readonly durationMs: number;
      readonly finishedAt: string;
      readonly error?: string;
    } & DataHookExecutionMetrics,
  ): Promise<void>;
  createTerminal(
    input: DataHookExecutionBaseFields & {
      readonly status: DataHookExecutionTerminalStatus;
      readonly durationMs: number;
      readonly finishedAt: string;
      readonly error?: string;
    } & DataHookExecutionMetrics,
  ): Promise<void>;
}
