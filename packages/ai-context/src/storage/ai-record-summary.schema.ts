import { z } from "zod";

export const AI_RECORD_SUMMARIES_COLLECTION = "ai_record_summaries" as const;

export function buildAiRecordSummaryDocId(
  entityName: string,
  recordId: string,
): string {
  return `${entityName}__${recordId}`;
}

export const aiRecordSummaryRagSchema = z.object({
  text: z.string().max(32_000),
  hash: z.string().trim().min(1),
  embedding: z.array(z.number()).max(4_096).optional(),
  updatedAt: z.string().trim().min(1),
  sourceHash: z.string().trim().min(1),
});

export type AiRecordSummaryRag = z.infer<typeof aiRecordSummaryRagSchema>;

export const aiRecordSummaryNarrativeSchema = z.object({
  text: z.string().max(200_000),
  sourceHash: z.string().trim().min(1),
  model: z.string().trim().min(1).optional(),
  updatedAt: z.string().trim().min(1),
});

export type AiRecordSummaryNarrative = z.infer<
  typeof aiRecordSummaryNarrativeSchema
>;

export const aiRecordSummaryRecordSchema = z.object({
  id: z.string().trim().min(1),
  tenantId: z.string().trim().min(1),
  entityName: z.string().trim().min(1),
  recordId: z.string().trim().min(1),
  ownerId: z.string().trim().min(1).optional(),
  accessUserIds: z.array(z.string().trim().min(1)).default([]),
  tenantWideRead: z.boolean().default(false),
  context: z.record(z.string(), z.unknown()).optional(),
  contextHash: z.string().trim().min(1).optional(),
  rag: aiRecordSummaryRagSchema.optional(),
  narratives: z.record(z.string(), aiRecordSummaryNarrativeSchema).default({}),
  createdAt: z.string().trim().min(1),
  updatedAt: z.string().trim().min(1),
});

export type AiRecordSummaryRecord = z.infer<typeof aiRecordSummaryRecordSchema>;

export interface AiRecordSummaryRepository {
  get(
    tenantId: string,
    entityName: string,
    recordId: string,
  ): Promise<AiRecordSummaryRecord | null>;
  getById(tenantId: string, id: string): Promise<AiRecordSummaryRecord | null>;
  getMany(
    tenantId: string,
    refs: readonly { readonly entityName: string; readonly recordId: string }[],
  ): Promise<readonly AiRecordSummaryRecord[]>;
  upsert(record: AiRecordSummaryRecord): Promise<AiRecordSummaryRecord>;
  delete(
    tenantId: string,
    entityName: string,
    recordId: string,
  ): Promise<boolean>;
}
