import { z } from "zod";

import { aiChatInputSchema } from "./ai-chat.schema.js";

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

export const aiJobRecordSchema = z.object({
  id: z.string().trim().min(1),
  tenantId: z.string().trim().min(1),
  feature: aiJobFeatureSchema,
  status: aiJobStatusSchema,
  input: aiChatInputSchema,
  output: aiChatOutputSchema.nullable(),
  error: z.string().nullable(),
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
