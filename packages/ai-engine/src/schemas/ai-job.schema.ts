import { z } from "zod";

import { aiChatInputSchema } from "./ai-chat.schema.js";
import { aiUiBuilderInputSchema } from "./ai-ui-builder.schema.js";

export const AI_JOBS_COLLECTION = "ai_jobs";

export const aiJobStatusSchema = z.enum([
  "pending",
  "running",
  "completed",
  "failed",
]);

export type AiJobStatus = z.infer<typeof aiJobStatusSchema>;

export const aiJobFeatureSchema = z.enum([
  "chat",
  "uiBuilder",
  "dataModelBuilder",
]);

export type AiJobFeature = z.infer<typeof aiJobFeatureSchema>;

export const aiChatOutputSchema = z.object({
  answer: z.string().trim().min(1),
});

export type AiChatOutput = z.infer<typeof aiChatOutputSchema>;

export const aiUiBuilderOrchestratorOutputSchema = z.object({
  summary: z.string().trim().min(1),
  stepCount: z.number().int().min(1),
});

export type AiUiBuilderOrchestratorOutput = z.infer<
  typeof aiUiBuilderOrchestratorOutputSchema
>;

export const aiJobOutputSchema = z.union([
  aiChatOutputSchema,
  aiUiBuilderOrchestratorOutputSchema,
]);

export type AiJobOutput = z.infer<typeof aiJobOutputSchema>;

export const aiJobProgressSchema = z.object({
  stepIndex: z.number().int().min(0),
  totalSteps: z.number().int().min(1),
  stepId: z.string().trim().min(1),
  stepLabel: z.string().trim().min(1),
  phase: z.string().trim().min(1),
});

export type AiJobProgress = z.infer<typeof aiJobProgressSchema>;

export const uiBuilderDraftSchema = z
  .record(z.string(), z.unknown())
  .nullable();

export const aiJobInputSchema = z.union([
  aiUiBuilderInputSchema,
  aiChatInputSchema,
]);

export type AiJobInput = z.infer<typeof aiJobInputSchema>;

export const aiJobRecordSchema = z.object({
  id: z.string().trim().min(1),
  tenantId: z.string().trim().min(1),
  feature: aiJobFeatureSchema,
  status: aiJobStatusSchema,
  input: aiJobInputSchema,
  output: aiJobOutputSchema.nullable(),
  error: z.string().nullable(),
  progress: aiJobProgressSchema.nullable().optional(),
  draft: uiBuilderDraftSchema.optional(),
  requestedBy: z.string().trim().min(1),
  permission: z.string().trim().min(1),
  createdAt: z.string().trim().min(1),
  updatedAt: z.string().trim().min(1),
});

export type AiJobRecord = z.infer<typeof aiJobRecordSchema>;

export const processAiChatTaskPayloadSchema = z.object({
  jobId: z.string().trim().min(1),
  tenantId: z.string().trim().min(1),
});

export type ProcessAiChatTaskPayload = z.infer<
  typeof processAiChatTaskPayloadSchema
>;
