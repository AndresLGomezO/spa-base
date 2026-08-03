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
  "dataHookCallAi",
  "dataHookBatchCallAi",
  "dataHookEmbedding",
  "gmailExtract",
  "userAiMemoryRefresh",
  "recordNarrativeRefresh",
  "documentExtract",
]);

export type AiJobFeature = z.infer<typeof aiJobFeatureSchema>;

export const aiJobOperationSchema = z.enum([
  "generateText",
  "generateChat",
  "generateEmbedding",
  "generateImage",
]);

export type AiJobOperation = z.infer<typeof aiJobOperationSchema>;

export const aiJobContextRefSchema = z.object({
  source: z.enum(["hookExecution", "emailIngestJob"]),
  id: z.string().trim().min(1),
});

export type AiJobContextRef = z.infer<typeof aiJobContextRefSchema>;

export const aiChatCitationSchema = z.object({
  kind: z.enum(["entity", "metric", "query", "memory"]),
  entityName: z.string().trim().min(1).optional(),
  recordId: z.string().trim().min(1).optional(),
  metricId: z.string().trim().min(1).optional(),
  queryId: z.string().trim().min(1).optional(),
  label: z.string().trim().min(1).max(500),
});

export type AiChatCitation = z.infer<typeof aiChatCitationSchema>;

export const aiChatOutputSchema = z.object({
  answer: z.string().trim().min(1),
  citations: z.array(aiChatCitationSchema).max(50).optional(),
  clarifyingQuestion: z.string().trim().min(1).max(2000).optional(),
  sessionId: z.string().trim().min(1).optional(),
});

export type AiChatOutput = z.infer<typeof aiChatOutputSchema>;

export const aiUiBuilderOrchestratorOutputSchema = z.object({
  summary: z.string().trim().min(1),
  stepCount: z.number().int().min(1),
});

export type AiUiBuilderOrchestratorOutput = z.infer<
  typeof aiUiBuilderOrchestratorOutputSchema
>;

export const aiTextOutputSchema = z.object({
  text: z.string(),
});

export type AiTextOutput = z.infer<typeof aiTextOutputSchema>;

export const aiEmbeddingOutputSchema = z.object({
  dimensions: z.number().int().min(0),
  sample: z.array(z.number()).max(32),
});

export type AiEmbeddingOutput = z.infer<typeof aiEmbeddingOutputSchema>;

export const aiImageOutputSchema = z.object({
  base64: z.string().min(1),
  mimeType: z.string().trim().min(1),
});

export type AiImageOutput = z.infer<typeof aiImageOutputSchema>;

export const aiBatchItemsOutputSchema = z.object({
  items: z.array(z.record(z.string(), z.unknown())),
});

export type AiBatchItemsOutput = z.infer<typeof aiBatchItemsOutputSchema>;

export const aiJobOutputSchema = z.union([
  aiChatOutputSchema,
  aiUiBuilderOrchestratorOutputSchema,
  aiTextOutputSchema,
  aiEmbeddingOutputSchema,
  aiImageOutputSchema,
  aiBatchItemsOutputSchema,
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

export const aiJobModelUsageSchema = z.object({
  modelId: z.string().trim().min(1),
  promptTokens: z.number().int().min(0).optional(),
  candidatesTokens: z.number().int().min(0).optional(),
  thoughtsTokens: z.number().int().min(0).optional(),
  cachedContentTokens: z.number().int().min(0).optional(),
  totalTokens: z.number().int().min(0).optional(),
  finishReason: z.string().optional(),
  outputDimensions: z.number().int().min(0).optional(),
  imageCount: z.number().int().min(0).optional(),
  aspectRatio: z.string().optional(),
  inputCharacters: z.number().int().min(0).optional(),
  estimatedCostUsd: z.number().min(0).optional(),
  costTier: z.enum(["standard", "longContext"]).optional(),
});

export type AiJobModelUsage = z.infer<typeof aiJobModelUsageSchema>;

export const aiJobStepTraceContextBlockSchema = z.object({
  id: z.string().trim().min(1),
  content: z.string(),
});

export const aiJobStepTraceEntrySchema = z.object({
  stepId: z.string().trim().min(1),
  attempt: z.number().int().min(0),
  systemInstruction: z.string(),
  contextBlocks: z.array(aiJobStepTraceContextBlockSchema),
  userText: z.string(),
  outputInstruction: z.string(),
  retryHint: z.string().optional(),
  rawModelAnswer: z.string(),
  parsedJson: z.unknown().optional(),
  validationErrors: z.array(z.string()).optional(),
  validationOk: z.boolean(),
  durationMs: z.number().int().min(0).optional(),
  draftBeforeStep: z.unknown().optional(),
  draftAfterStep: z.unknown().optional(),
  modelUsage: aiJobModelUsageSchema.optional(),
});

export type AiJobStepTraceEntry = z.infer<typeof aiJobStepTraceEntrySchema>;

export const aiJobStepTraceSchema = z.array(aiJobStepTraceEntrySchema);

export type AiJobStepTrace = z.infer<typeof aiJobStepTraceSchema>;

export const uiBuilderDraftSchema = z
  .record(z.string(), z.unknown())
  .nullable();

export const aiDataHookCallAiInputSchema = z.object({
  kind: z.literal("dataHookCallAi"),
  hookId: z.string().trim().min(1),
  hookName: z.string().trim().min(1).optional(),
  hookExecutionId: z.string().trim().min(1).optional(),
  recordId: z.string().trim().min(1).optional(),
  entityName: z.string().trim().min(1).optional(),
  prompt: z.string(),
  systemInstruction: z.string().optional(),
  cacheKey: z.string().optional(),
  includeEntities: z.array(z.string().trim().min(1)).optional(),
});

export type AiDataHookCallAiInput = z.infer<typeof aiDataHookCallAiInputSchema>;

export const aiDataHookBatchCallAiInputSchema = z.object({
  kind: z.literal("dataHookBatchCallAi"),
  hookId: z.string().trim().min(1).optional(),
  hookName: z.string().trim().min(1).optional(),
  itemCount: z.number().int().min(0),
  promptPreview: z.string().optional(),
});

export type AiDataHookBatchCallAiInput = z.infer<
  typeof aiDataHookBatchCallAiInputSchema
>;

export const aiDataHookEmbeddingInputSchema = z.object({
  kind: z.literal("dataHookEmbedding"),
  hookId: z.string().trim().min(1).optional(),
  hookExecutionId: z.string().trim().min(1).optional(),
  recordId: z.string().trim().min(1).optional(),
  entityName: z.string().trim().min(1).optional(),
  text: z.string(),
});

export type AiDataHookEmbeddingInput = z.infer<
  typeof aiDataHookEmbeddingInputSchema
>;

export const aiRecordNarrativeRefreshInputSchema = z.object({
  kind: z.literal("recordNarrativeRefresh"),
  entityName: z.string().trim().min(1),
  recordId: z.string().trim().min(1),
  variant: z.string().trim().min(1).default("default"),
  prompt: z.string().optional(),
  systemInstruction: z.string().optional(),
});

export type AiRecordNarrativeRefreshInput = z.infer<
  typeof aiRecordNarrativeRefreshInputSchema
>;

export const aiGmailExtractInputSchema = z.object({
  kind: z.literal("gmailExtract"),
  userId: z.string().trim().min(1),
  messageId: z.string().trim().min(1).optional(),
  entityName: z.string().trim().min(1),
  aiInstructions: z.string().optional(),
});

export type AiGmailExtractInput = z.infer<typeof aiGmailExtractInputSchema>;

/** Pointers only — never raw document bytes or extracted PII. */
export const aiDocumentExtractInputSchema = z.object({
  kind: z.literal("documentExtract"),
  attachmentId: z.string().trim().min(1),
  entityName: z.literal("attachment").default("attachment"),
  templateId: z.string().trim().min(1).optional(),
  documentType: z.string().trim().min(1).optional(),
  financialItemId: z.string().trim().min(1).optional(),
  accountId: z.string().trim().min(1).optional(),
  phase: z.enum(["classify", "extract"]).default("extract"),
});

export type AiDocumentExtractInput = z.infer<
  typeof aiDocumentExtractInputSchema
>;

export const aiUiBuilderStepInputSchema = z.object({
  kind: z.literal("uiBuilderStep"),
  stepId: z.string().trim().min(1),
  entityName: z.string().trim().min(1).optional(),
  surface: z.string().trim().min(1).optional(),
  question: z.string().optional(),
});

export type AiUiBuilderStepInput = z.infer<typeof aiUiBuilderStepInputSchema>;

export const aiJobInputSchema = z.union([
  aiUiBuilderInputSchema,
  aiChatInputSchema,
  aiDataHookCallAiInputSchema,
  aiDataHookBatchCallAiInputSchema,
  aiDataHookEmbeddingInputSchema,
  aiRecordNarrativeRefreshInputSchema,
  aiGmailExtractInputSchema,
  aiDocumentExtractInputSchema,
  aiUiBuilderStepInputSchema,
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
  /** Model operation for controller-driven jobs. Optional for legacy records. */
  operation: aiJobOperationSchema.optional(),
  parentJobId: z.string().trim().min(1).optional(),
  contextRef: aiJobContextRefSchema.optional(),
  progress: aiJobProgressSchema.nullable().optional(),
  draft: uiBuilderDraftSchema.optional(),
  stepTrace: aiJobStepTraceSchema.optional(),
  modelUsage: aiJobModelUsageSchema.optional(),
  metrics: z
    .object({
      stepCount: z.number().int().min(0).optional(),
      toolCallCount: z.number().int().min(0).optional(),
      cacheHitRatio: z.number().min(0).max(1).optional(),
      retrievalTop1Score: z.number().optional(),
      confidence: z.number().min(0).max(1).optional(),
      parseRetryCount: z.number().int().min(0).optional(),
      promptTokens: z.number().int().min(0).optional(),
      candidatesTokens: z.number().int().min(0).optional(),
      cachedContentTokens: z.number().int().min(0).optional(),
      totalTokens: z.number().int().min(0).optional(),
      estimatedCostUsd: z.number().min(0).optional(),
    })
    .optional(),
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
