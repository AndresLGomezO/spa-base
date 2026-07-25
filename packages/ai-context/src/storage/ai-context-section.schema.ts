import { z } from "zod";

export const AI_CONTEXT_SECTIONS_COLLECTION = "__ai_context_sections";

export const aiContextSectionScopeSchema = z.enum(["tenantWide", "perUser"]);
export type AiContextSectionScope = z.infer<typeof aiContextSectionScopeSchema>;

export const aiContextSectionVisibilitySchema = z.object({
  requiredPermissions: z.array(z.string().trim().min(1)).max(50).optional(),
});

export type AiContextSectionVisibility = z.infer<
  typeof aiContextSectionVisibilitySchema
>;

const filterConditionSchema = z.object({
  field: z.string().trim().min(1),
  operator: z.enum(["eq", "neq", "gt", "gte", "lt", "lte", "contains", "in"]),
  value: z.unknown(),
});

export const aiContextSectionBlockStaticMarkdownSchema = z.object({
  kind: z.literal("staticMarkdown"),
  label: z.string().trim().min(1).max(200).optional(),
  content: z.string().max(16_000),
});

export const aiContextSectionBlockEntityFieldSchema = z.object({
  kind: z.literal("entityField"),
  label: z.string().trim().min(1).max(200).optional(),
  entityName: z.string().trim().min(1),
  source: z.enum(["singleton", "recordId", "firstMatch"]),
  recordId: z.string().trim().min(1).optional(),
  where: z.array(filterConditionSchema).max(20).optional(),
  field: z.string().trim().min(1),
  prefix: z.string().max(500).optional(),
  missingText: z.string().max(500).optional(),
});

export const aiContextSectionBlockEntityRecordsSummarySchema = z.object({
  kind: z.literal("entityRecordsSummary"),
  label: z.string().trim().min(1).max(200).optional(),
  entityName: z.string().trim().min(1),
  fields: z.array(z.string().trim().min(1)).min(1).max(20),
  where: z.array(filterConditionSchema).max(20).optional(),
  limit: z.number().int().min(1).max(20).default(10),
  joinAs: z.enum(["list", "table"]).default("list"),
});

export const aiContextSectionBlockMetricValueSchema = z.object({
  kind: z.literal("metricValue"),
  label: z.string().trim().min(1).max(200).optional(),
  metricDefinitionId: z.string().trim().min(1),
  parameterMap: z.record(z.string(), z.unknown()).optional(),
  format: z.enum(["raw", "currency", "percent"]).default("raw"),
});

export const aiContextSectionBlockSavedQueryTopSchema = z.object({
  kind: z.literal("savedQueryTop"),
  label: z.string().trim().min(1).max(200).optional(),
  queryDefinitionId: z.string().trim().min(1),
  limit: z.number().int().min(1).max(20).default(10),
  fields: z.array(z.string().trim().min(1)).min(1).max(20),
});

export const aiContextSectionBlockSchema = z.discriminatedUnion("kind", [
  aiContextSectionBlockStaticMarkdownSchema,
  aiContextSectionBlockEntityFieldSchema,
  aiContextSectionBlockEntityRecordsSummarySchema,
  aiContextSectionBlockMetricValueSchema,
  aiContextSectionBlockSavedQueryTopSchema,
]);

export type AiContextSectionBlock = z.infer<typeof aiContextSectionBlockSchema>;
export type AiContextSectionBlockKind = AiContextSectionBlock["kind"];

export const aiContextSectionRecordSchema = z.object({
  id: z.string().trim().min(1),
  tenantId: z.string().trim().min(1),
  name: z.string().trim().min(1).max(200),
  description: z.string().trim().max(2000).optional(),
  order: z.number().int(),
  enabled: z.boolean(),
  scope: aiContextSectionScopeSchema,
  visibility: aiContextSectionVisibilitySchema.default({}),
  blocks: z.array(aiContextSectionBlockSchema).max(50).default([]),
  createdAt: z.string().trim().min(1),
  updatedAt: z.string().trim().min(1),
});

export type AiContextSectionRecord = z.infer<
  typeof aiContextSectionRecordSchema
>;

export const createAiContextSectionInputSchema = z.object({
  name: z.string().trim().min(1).max(200),
  description: z.string().trim().max(2000).optional(),
  order: z.number().int().optional(),
  enabled: z.boolean().optional(),
  scope: aiContextSectionScopeSchema.optional(),
  visibility: aiContextSectionVisibilitySchema.optional(),
  blocks: z.array(aiContextSectionBlockSchema).max(50).optional(),
});

export type CreateAiContextSectionInput = z.infer<
  typeof createAiContextSectionInputSchema
>;

export const patchAiContextSectionInputSchema = z.object({
  name: z.string().trim().min(1).max(200).optional(),
  description: z.string().trim().max(2000).nullable().optional(),
  order: z.number().int().optional(),
  enabled: z.boolean().optional(),
  scope: aiContextSectionScopeSchema.optional(),
  visibility: aiContextSectionVisibilitySchema.optional(),
  blocks: z.array(aiContextSectionBlockSchema).max(50).optional(),
});

export type PatchAiContextSectionInput = z.infer<
  typeof patchAiContextSectionInputSchema
>;

export const aiContextSectionsCatalogEnvelopeSchema = z.object({
  kind: z.literal("ai-context-sections-catalog"),
  version: z.literal(1),
  items: z.array(aiContextSectionRecordSchema),
});

export type AiContextSectionsCatalogEnvelope = z.infer<
  typeof aiContextSectionsCatalogEnvelopeSchema
>;

export interface AiContextSectionRepository {
  list(tenantId: string): Promise<readonly AiContextSectionRecord[]>;
  listEnabled(tenantId: string): Promise<readonly AiContextSectionRecord[]>;
  getById(tenantId: string, id: string): Promise<AiContextSectionRecord | null>;
  create(
    tenantId: string,
    input: CreateAiContextSectionInput,
  ): Promise<AiContextSectionRecord>;
  update(
    tenantId: string,
    id: string,
    input: PatchAiContextSectionInput,
  ): Promise<AiContextSectionRecord>;
  delete(tenantId: string, id: string): Promise<void>;
  replaceAll(
    tenantId: string,
    items: readonly AiContextSectionRecord[],
  ): Promise<readonly AiContextSectionRecord[]>;
}
