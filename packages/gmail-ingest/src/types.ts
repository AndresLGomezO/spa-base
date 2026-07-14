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
  /** Tenant that connected Gmail (needed for Pub/Sub → window sync jobs). */
  tenantId: z.string().trim().min(1).nullable().default(null),
  status: gmailConnectionStatusSchema,
  emailAddress: z.string().trim().email().nullable(),
  scopes: z.array(z.string().trim().min(1)),
  encryptedRefreshToken: z.string().trim().min(1).nullable(),
  encryptedAccessToken: z.string().trim().min(1).nullable(),
  accessTokenExpiresAt: z.string().trim().nullable(),
  /** Push watch cursor only (OAuth / renew). Window sync does not consume history.list. */
  historyId: z.string().trim().nullable(),
  watchExpiration: z.string().trim().nullable(),
  /** Lower bound for the next window sync; null = bootstrap (full match history). */
  ingestWatermarkAt: z.string().trim().nullable().default(null),
  /** sha256 of sorted message ids from the last window listing. */
  ingestBatchHash: z.string().trim().nullable().default(null),
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
  ingestWatermarkAt: z.string().trim().nullable(),
  watchExpiration: z.string().trim().nullable(),
  lastError: z.string().trim().nullable(),
});
export type GmailConnectionPublicStatus = z.infer<
  typeof gmailConnectionPublicStatusSchema
>;

export const emailBodyFieldTransformSchema = z.enum([
  "trim",
  "amount",
  "slashDate",
  "compactYmd",
  "monthNameDate",
  "valueMap",
  "literal",
]);
export type EmailBodyFieldTransform = z.infer<
  typeof emailBodyFieldTransformSchema
>;

/** Explicit shape (not `z.infer`) so web typecheck does not explode on ZodEffects. */
export type EmailBodyFieldExtractor = {
  readonly field: string;
  readonly label: string;
  readonly pattern?: string;
  readonly captureGroup?: number;
  readonly transform?: EmailBodyFieldTransform;
  readonly valueMap?: Readonly<Record<string, string>>;
  readonly literal?: string;
  /**
   * When true and this field is present after extract, the message is relevant
   * even if amount is missing (e.g. period-statement headers).
   */
  readonly sufficientForRelevance?: boolean;
};

/** Optional Gmail → file attachment import (worker-side; not a hook action). */
export type EmailAttachmentImportConfig = {
  readonly enabled: boolean;
  /** Target attachment.documentType value (tenant-defined enum). */
  readonly documentType: string;
  /** Extracted field used as `documentDate` when present. */
  readonly documentDateField?: string;
  /**
   * Entity field that receives `binding.recordId` (tenant configures the
   * field name on the binding, e.g. a parent relation on `attachment`).
   */
  readonly recordIdField?: string;
};

export const emailAttachmentImportConfigSchema: z.ZodType<EmailAttachmentImportConfig> =
  z.object({
    enabled: z.boolean(),
    documentType: z.string().trim().min(1),
    documentDateField: z.string().trim().min(1).optional(),
    recordIdField: z.string().trim().min(1).optional(),
  }) as z.ZodType<EmailAttachmentImportConfig>;

export const emailBodyFieldExtractorSchema: z.ZodType<EmailBodyFieldExtractor> =
  z
    .object({
      field: z.string().trim().min(1),
      label: z.string().trim().optional().default(""),
      /** Full-body regex (`/source/flags` or raw source). When set, used instead of label line match. */
      pattern: z.string().trim().min(1).optional(),
      /** Capture group index for `pattern` (default 1). */
      captureGroup: z.number().int().min(0).optional(),
      transform: emailBodyFieldTransformSchema.optional(),
      valueMap: z.record(z.string(), z.string()).optional(),
      literal: z.string().trim().min(1).optional(),
      sufficientForRelevance: z.boolean().optional(),
    })
    .superRefine((value, ctx) => {
      const transform = value.transform ?? "trim";
      if (transform === "literal") {
        if (!value.literal) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "literal transform requires literal value",
            path: ["literal"],
          });
        }
        return;
      }
      const hasLabel = Boolean(value.label && value.label.trim().length > 0);
      const hasPattern = Boolean(
        value.pattern && value.pattern.trim().length > 0,
      );
      if (!hasLabel && !hasPattern) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "label or pattern is required unless transform is literal",
          path: ["label"],
        });
      }
    }) as z.ZodType<EmailBodyFieldExtractor>;

export type EmailMatchBinding = {
  readonly id: string;
  readonly tenantId: string;
  readonly userId: string;
  readonly entityName: string;
  readonly recordId: string;
  readonly enabled: boolean;
  /**
   * When true, the next window sync also lists this binding without an after:
   * lower bound (one-shot historical catch-up for new/enabled rules).
   */
  readonly catchupNeeded?: boolean;
  readonly fromAddresses: readonly string[];
  readonly subjectPatterns: readonly string[];
  readonly bodyPatterns: readonly string[];
  readonly gmailQueryExtra?: string | null;
  readonly useAi: boolean;
  readonly aiInstructions?: string | null;
  readonly bodyFieldExtractors: readonly EmailBodyFieldExtractor[];
  readonly attachmentImport?: EmailAttachmentImportConfig | null;
  readonly createdAt: string;
  readonly updatedAt: string;
};

export const emailMatchBindingSchema: z.ZodType<EmailMatchBinding> = z.object({
  id: z.string().trim().min(1),
  tenantId: z.string().trim().min(1),
  userId: z.string().trim().min(1),
  entityName: z.string().trim().min(1),
  recordId: z.string().trim().min(1),
  enabled: z.boolean(),
  catchupNeeded: z.boolean().default(true),
  fromAddresses: z.array(z.string().trim().min(1)).default([]),
  subjectPatterns: z.array(z.string().trim().min(1)).default([]),
  bodyPatterns: z.array(z.string().trim().min(1)).default([]),
  gmailQueryExtra: z.string().trim().nullable().optional(),
  useAi: z.boolean().default(false),
  aiInstructions: z.string().trim().nullable().optional(),
  bodyFieldExtractors: z.array(emailBodyFieldExtractorSchema).default([]),
  attachmentImport: emailAttachmentImportConfigSchema.nullable().optional(),
  createdAt: z.string().trim().min(1),
  updatedAt: z.string().trim().min(1),
}) as z.ZodType<EmailMatchBinding>;

export type CreateEmailMatchBindingInput = {
  readonly entityName: string;
  readonly recordId: string;
  readonly enabled?: boolean;
  readonly fromAddresses?: readonly string[];
  readonly subjectPatterns?: readonly string[];
  readonly bodyPatterns?: readonly string[];
  readonly gmailQueryExtra?: string | null;
  readonly useAi?: boolean;
  readonly aiInstructions?: string | null;
  readonly bodyFieldExtractors?: readonly EmailBodyFieldExtractor[];
  readonly attachmentImport?: EmailAttachmentImportConfig | null;
};

export const createEmailMatchBindingInputSchema: z.ZodType<CreateEmailMatchBindingInput> =
  z.object({
    entityName: z.string().trim().min(1),
    recordId: z.string().trim().min(1),
    enabled: z.boolean().optional(),
    fromAddresses: z.array(z.string().trim().min(1)).optional(),
    subjectPatterns: z.array(z.string().trim().min(1)).optional(),
    bodyPatterns: z.array(z.string().trim().min(1)).optional(),
    gmailQueryExtra: z.string().trim().nullable().optional(),
    useAi: z.boolean().optional(),
    aiInstructions: z.string().trim().nullable().optional(),
    bodyFieldExtractors: z.array(emailBodyFieldExtractorSchema).optional(),
    attachmentImport: emailAttachmentImportConfigSchema.nullable().optional(),
  }) as z.ZodType<CreateEmailMatchBindingInput>;

export type PatchEmailMatchBindingInput = {
  readonly enabled?: boolean;
  readonly catchupNeeded?: boolean;
  readonly fromAddresses?: readonly string[];
  readonly subjectPatterns?: readonly string[];
  readonly bodyPatterns?: readonly string[];
  readonly gmailQueryExtra?: string | null;
  readonly useAi?: boolean;
  readonly aiInstructions?: string | null;
  readonly bodyFieldExtractors?: readonly EmailBodyFieldExtractor[];
  readonly attachmentImport?: EmailAttachmentImportConfig | null;
};

export const patchEmailMatchBindingInputSchema: z.ZodType<PatchEmailMatchBindingInput> =
  z.object({
    enabled: z.boolean().optional(),
    catchupNeeded: z.boolean().optional(),
    fromAddresses: z.array(z.string().trim().min(1)).optional(),
    subjectPatterns: z.array(z.string().trim().min(1)).optional(),
    bodyPatterns: z.array(z.string().trim().min(1)).optional(),
    gmailQueryExtra: z.string().trim().nullable().optional(),
    useAi: z.boolean().optional(),
    aiInstructions: z.string().trim().nullable().optional(),
    bodyFieldExtractors: z.array(emailBodyFieldExtractorSchema).optional(),
    attachmentImport: emailAttachmentImportConfigSchema.nullable().optional(),
  }) as z.ZodType<PatchEmailMatchBindingInput>;

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
  contentFingerprint: z.string().trim().nullable().default(null),
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

export const emailIngestFingerprintRecordSchema = z.object({
  id: z.string().trim().min(1),
  tenantId: z.string().trim().min(1),
  userId: z.string().trim().min(1),
  contentFingerprint: z.string().trim().min(1),
  gmailMessageId: z.string().trim().min(1),
  processedAt: z.string().trim().min(1),
});
export type EmailIngestFingerprintRecord = z.infer<
  typeof emailIngestFingerprintRecordSchema
>;

export const emailIngestJobStatusSchema = z.enum([
  "pending",
  "running",
  "completed",
  "failed",
]);
export type EmailIngestJobStatus = z.infer<typeof emailIngestJobStatusSchema>;

export const emailIngestJobKindSchema = z.enum([
  "windowSync",
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

/** Per window-sync run counters (process-message updates atomically). */
export const emailIngestRunMetricsSchema = z.object({
  /** Distinct Gmail message ids listed for this run. */
  fetched: z.number().int().nonnegative().default(0),
  /** Process-message tasks enqueued. */
  queued: z.number().int().nonnegative().default(0),
  /** Messages currently being processed. */
  processing: z.number().int().nonnegative().default(0),
  /** Messages that reached a terminal outcome. */
  finished: z.number().int().nonnegative().default(0),
  /** Hooks applied successfully. */
  processed: z.number().int().nonnegative().default(0),
  skippedDedup: z.number().int().nonnegative().default(0),
  skippedNoMatch: z.number().int().nonnegative().default(0),
  skippedIrrelevant: z.number().int().nonnegative().default(0),
  failed: z.number().int().nonnegative().default(0),
});
export type EmailIngestRunMetrics = z.infer<typeof emailIngestRunMetricsSchema>;

export type EmailIngestMessageOutcome =
  | "processed"
  | "skippedDedup"
  | "skippedNoMatch"
  | "skippedIrrelevant"
  | "failed";

export function emptyEmailIngestRunMetrics(): EmailIngestRunMetrics {
  return emailIngestRunMetricsSchema.parse({});
}

/** Messages still waiting in the queue (not started and not finished). */
export function emailIngestPendingCount(
  metrics: EmailIngestRunMetrics,
): number {
  return Math.max(0, metrics.queued - metrics.finished - metrics.processing);
}

export const emailIngestJobRecordSchema = z.object({
  id: z.string().trim().min(1),
  tenantId: z.string().trim().min(1),
  userId: z.string().trim().min(1),
  kind: emailIngestJobKindSchema,
  status: emailIngestJobStatusSchema,
  title: z.string().trim().min(1),
  stepTrace: z.array(emailIngestStepTraceEntrySchema).default([]),
  runMetrics: emailIngestRunMetricsSchema.default({
    fetched: 0,
    queued: 0,
    processing: 0,
    finished: 0,
    processed: 0,
    skippedDedup: 0,
    skippedNoMatch: 0,
    skippedIrrelevant: 0,
    failed: 0,
  }),
  windowQuery: z.string().trim().nullable().optional(),
  errorMessage: z.string().trim().nullable().optional(),
  createdAt: z.string().trim().min(1),
  updatedAt: z.string().trim().min(1),
  completedAt: z.string().trim().nullable().optional(),
});
export type EmailIngestJobRecord = z.infer<typeof emailIngestJobRecordSchema>;

export const gmailMessageAttachmentSchema = z.object({
  attachmentId: z.string().trim().min(1),
  filename: z.string().trim().min(1),
  mimeType: z.string().trim().min(1),
  size: z.number().int().nonnegative(),
});
export type GmailMessageAttachment = z.infer<
  typeof gmailMessageAttachmentSchema
>;

export const gmailMessageEnvelopeSchema = z.object({
  messageId: z.string().trim().min(1),
  threadId: z.string().trim().nullable(),
  /** RFC 5322 Message-ID header when present. */
  rfcMessageId: z.string().trim().nullable().optional(),
  from: z.string().trim().min(1),
  subject: z.string().trim(),
  snippet: z.string().trim(),
  date: z.string().trim().nullable(),
  bodyText: z.string().trim().nullable().optional(),
  attachments: z.array(gmailMessageAttachmentSchema).optional().default([]),
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
      ingestWatermarkAt: null,
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
    ingestWatermarkAt: record.ingestWatermarkAt ?? null,
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
