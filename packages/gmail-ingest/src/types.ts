import { z } from "zod";

export const gmailConnectionStatusSchema = z.enum([
  "connected",
  "disconnected",
  "error",
  "reauth_required",
]);
export type GmailConnectionStatus = z.infer<typeof gmailConnectionStatusSchema>;

export const gmailConnectionRecordSchema = z.object({
  userId: z.string().trim().min(1),
  status: gmailConnectionStatusSchema,
  emailAddress: z.string().trim().email().nullable(),
  scopes: z.array(z.string().trim().min(1)),
  encryptedRefreshToken: z.string().trim().min(1).nullable(),
  encryptedAccessToken: z.string().trim().min(1).nullable(),
  accessTokenExpiresAt: z.string().trim().nullable(),
  historyId: z.string().trim().nullable(),
  watchExpiration: z.string().trim().nullable(),
  lastSyncAt: z.string().trim().nullable(),
  lastError: z.string().trim().nullable(),
  createdAt: z.string().trim().min(1),
  updatedAt: z.string().trim().min(1),
});
export type GmailConnectionRecord = z.infer<typeof gmailConnectionRecordSchema>;

export const gmailConnectionPublicStatusSchema = z.object({
  connected: z.boolean(),
  status: gmailConnectionStatusSchema,
  emailAddress: z.string().trim().email().nullable(),
  scopes: z.array(z.string().trim().min(1)),
  lastSyncAt: z.string().trim().nullable(),
  watchExpiration: z.string().trim().nullable(),
  lastError: z.string().trim().nullable(),
});
export type GmailConnectionPublicStatus = z.infer<
  typeof gmailConnectionPublicStatusSchema
>;

export const emailMatchBindingSchema = z.object({
  id: z.string().trim().min(1),
  tenantId: z.string().trim().min(1),
  userId: z.string().trim().min(1),
  entityName: z.string().trim().min(1),
  recordId: z.string().trim().min(1),
  enabled: z.boolean(),
  fromAddresses: z.array(z.string().trim().min(1)).default([]),
  subjectPatterns: z.array(z.string().trim().min(1)).default([]),
  bodyPatterns: z.array(z.string().trim().min(1)).default([]),
  gmailQueryExtra: z.string().trim().nullable().optional(),
  useAi: z.boolean().default(false),
  aiInstructions: z.string().trim().nullable().optional(),
  createdAt: z.string().trim().min(1),
  updatedAt: z.string().trim().min(1),
});
export type EmailMatchBinding = z.infer<typeof emailMatchBindingSchema>;

export const createEmailMatchBindingInputSchema = z.object({
  entityName: z.string().trim().min(1),
  recordId: z.string().trim().min(1),
  enabled: z.boolean().optional(),
  fromAddresses: z.array(z.string().trim().min(1)).optional(),
  subjectPatterns: z.array(z.string().trim().min(1)).optional(),
  bodyPatterns: z.array(z.string().trim().min(1)).optional(),
  gmailQueryExtra: z.string().trim().nullable().optional(),
  useAi: z.boolean().optional(),
  aiInstructions: z.string().trim().nullable().optional(),
});
export type CreateEmailMatchBindingInput = z.infer<
  typeof createEmailMatchBindingInputSchema
>;

export const patchEmailMatchBindingInputSchema = z.object({
  enabled: z.boolean().optional(),
  fromAddresses: z.array(z.string().trim().min(1)).optional(),
  subjectPatterns: z.array(z.string().trim().min(1)).optional(),
  bodyPatterns: z.array(z.string().trim().min(1)).optional(),
  gmailQueryExtra: z.string().trim().nullable().optional(),
  useAi: z.boolean().optional(),
  aiInstructions: z.string().trim().nullable().optional(),
});
export type PatchEmailMatchBindingInput = z.infer<
  typeof patchEmailMatchBindingInputSchema
>;

export const emailIngestProcessedStatusSchema = z.enum([
  "processed",
  "skipped_irrelevant",
  "skipped_no_match",
  "failed",
]);
export type EmailIngestProcessedStatus = z.infer<
  typeof emailIngestProcessedStatusSchema
>;

export const emailIngestProcessedRecordSchema = z.object({
  id: z.string().trim().min(1),
  tenantId: z.string().trim().min(1),
  userId: z.string().trim().min(1),
  gmailMessageId: z.string().trim().min(1),
  threadId: z.string().trim().nullable(),
  bindingId: z.string().trim().nullable(),
  entityName: z.string().trim().nullable(),
  recordId: z.string().trim().nullable(),
  status: emailIngestProcessedStatusSchema,
  hookSummary: z.string().trim().nullable().optional(),
  errorMessage: z.string().trim().nullable().optional(),
  processedAt: z.string().trim().min(1),
});
export type EmailIngestProcessedRecord = z.infer<
  typeof emailIngestProcessedRecordSchema
>;

export const emailIngestJobStatusSchema = z.enum([
  "pending",
  "running",
  "completed",
  "failed",
]);
export type EmailIngestJobStatus = z.infer<typeof emailIngestJobStatusSchema>;

export const emailIngestJobKindSchema = z.enum([
  "backfill",
  "historySync",
  "watchRenew",
  "processMessage",
]);
export type EmailIngestJobKind = z.infer<typeof emailIngestJobKindSchema>;

export const emailIngestStepTraceEntrySchema = z.object({
  stepId: z.string().trim().min(1),
  timestamp: z.string().trim().min(1),
  status: z.enum(["info", "success", "error", "skipped"]),
  message: z.string().trim().min(1),
  meta: z.record(z.string(), z.unknown()).optional(),
});
export type EmailIngestStepTraceEntry = z.infer<
  typeof emailIngestStepTraceEntrySchema
>;

export const emailIngestJobRecordSchema = z.object({
  id: z.string().trim().min(1),
  tenantId: z.string().trim().min(1),
  userId: z.string().trim().min(1),
  kind: emailIngestJobKindSchema,
  status: emailIngestJobStatusSchema,
  title: z.string().trim().min(1),
  stepTrace: z.array(emailIngestStepTraceEntrySchema).default([]),
  errorMessage: z.string().trim().nullable().optional(),
  createdAt: z.string().trim().min(1),
  updatedAt: z.string().trim().min(1),
  completedAt: z.string().trim().nullable().optional(),
});
export type EmailIngestJobRecord = z.infer<typeof emailIngestJobRecordSchema>;

export const gmailMessageEnvelopeSchema = z.object({
  messageId: z.string().trim().min(1),
  threadId: z.string().trim().nullable(),
  from: z.string().trim().min(1),
  subject: z.string().trim(),
  snippet: z.string().trim(),
  date: z.string().trim().nullable(),
  bodyText: z.string().trim().nullable().optional(),
});
export type GmailMessageEnvelope = z.infer<typeof gmailMessageEnvelopeSchema>;

export const emailAiExtractResultSchema = z.object({
  relevant: z.boolean(),
  reason: z.string().trim(),
  fields: z.record(z.string(), z.unknown()).default({}),
  suggestedActions: z.array(z.string().trim().min(1)).optional(),
});
export type EmailAiExtractResult = z.infer<typeof emailAiExtractResultSchema>;

export function toPublicGmailStatus(
  record: GmailConnectionRecord | null,
): GmailConnectionPublicStatus {
  if (!record || record.status === "disconnected") {
    return {
      connected: false,
      status: record?.status ?? "disconnected",
      emailAddress: null,
      scopes: [],
      lastSyncAt: null,
      watchExpiration: null,
      lastError: record?.lastError ?? null,
    };
  }

  return {
    connected: record.status === "connected",
    status: record.status,
    emailAddress: record.emailAddress,
    scopes: record.scopes,
    lastSyncAt: record.lastSyncAt,
    watchExpiration: record.watchExpiration,
    lastError: record.lastError,
  };
}

export function buildProcessedDocId(
  userId: string,
  gmailMessageId: string,
): string {
  return `${userId}_${gmailMessageId}`.replace(/[^a-zA-Z0-9_-]/g, "_");
}
