import { z } from "zod";

export const STATEMENT_EXTRACTIONS_COLLECTION =
  "statement_extractions" as const;

export const statementExtractionStatusSchema = z.enum([
  "awaitingReview",
  "applied",
  "rejected",
  "failed",
  "processing",
]);

export type StatementExtractionStatus = z.infer<
  typeof statementExtractionStatusSchema
>;

export const statementExtractionEncryptedPayloadSchema = z.object({
  ciphertext: z.string().min(1),
  iv: z.string().min(1),
  tag: z.string().min(1),
  wrappedDek: z.string().min(1),
  kmsKeyName: z.string().min(1),
  aad: z.string().min(1),
});

export type StatementExtractionEncryptedPayload = z.infer<
  typeof statementExtractionEncryptedPayloadSchema
>;

export const statementExtractionDlpFindingSchema = z.object({
  infoType: z.string().trim().min(1),
  quote: z.string().optional(),
  likelihood: z.string().trim().min(1),
  action: z.enum(["redacted", "masked", "kept"]),
});

export type StatementExtractionDlpFinding = z.infer<
  typeof statementExtractionDlpFindingSchema
>;

export const statementExtractionModelUsageSchema = z.object({
  modelId: z.string().trim().min(1),
  promptTokens: z.number().int().min(0).optional(),
  candidatesTokens: z.number().int().min(0).optional(),
  thoughtsTokens: z.number().int().min(0).optional(),
  cachedContentTokens: z.number().int().min(0).optional(),
  totalTokens: z.number().int().min(0).optional(),
  estimatedCostUsd: z.number().min(0).optional(),
});

export type StatementExtractionModelUsage = z.infer<
  typeof statementExtractionModelUsageSchema
>;

export const statementExtractionRecordSchema = z.object({
  id: z.string().trim().min(1),
  tenantId: z.string().trim().min(1),
  attachmentId: z.string().trim().min(1),
  templateId: z.string().trim().min(1).optional(),
  documentType: z.string().trim().min(1).optional(),
  financialItemId: z.string().trim().min(1).optional(),
  accountId: z.string().trim().min(1).optional(),
  status: statementExtractionStatusSchema,
  preview: z.record(z.string(), z.unknown()),
  encryptedPayload: statementExtractionEncryptedPayloadSchema,
  dlpFindings: z.array(statementExtractionDlpFindingSchema).default([]),
  aiJobId: z.string().trim().min(1).optional(),
  modelUsage: statementExtractionModelUsageSchema.optional(),
  confidence: z.number().min(0).max(1).optional(),
  error: z.string().optional(),
  createdAt: z.string().trim().min(1),
  updatedAt: z.string().trim().min(1),
  appliedAt: z.string().trim().min(1).optional(),
  rejectedAt: z.string().trim().min(1).optional(),
  requestedBy: z.string().trim().min(1).optional(),
});

export type StatementExtractionRecord = z.infer<
  typeof statementExtractionRecordSchema
>;

export type StatementExtractionListOptions = {
  readonly status?: StatementExtractionStatus | string;
  readonly limit?: number;
};

export type StatementExtractionPatch = Partial<
  Omit<StatementExtractionRecord, "id" | "tenantId" | "createdAt">
>;

export interface StatementExtractionRepository {
  get(tenantId: string, id: string): Promise<StatementExtractionRecord | null>;
  list(
    tenantId: string,
    options?: StatementExtractionListOptions,
  ): Promise<readonly StatementExtractionRecord[]>;
  create(record: StatementExtractionRecord): Promise<StatementExtractionRecord>;
  update(
    tenantId: string,
    id: string,
    patch: StatementExtractionPatch,
  ): Promise<StatementExtractionRecord>;
}
