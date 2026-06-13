import { z } from "zod";

export const TENANT_AI_CONTEXTS_COLLECTION = "tenant_ai_contexts";

export const tenantAiContextKindSchema = z.enum([
  "theme",
  "entityCatalog",
  "entity",
]);

export type TenantAiContextKind = z.infer<typeof tenantAiContextKindSchema>;

export const tenantAiContextRecordSchema = z.object({
  id: z.string().trim().min(1),
  tenantId: z.string().trim().min(1),
  kind: tenantAiContextKindSchema,
  scopeKey: z.string().trim().min(1).optional(),
  sourceHash: z.string().trim().min(1),
  fragments: z.record(z.string(), z.string()),
  assembled: z.string().optional(),
  updatedAt: z.string().trim().min(1),
});

export type TenantAiContextRecord = z.infer<typeof tenantAiContextRecordSchema>;

export interface TenantAiContextRepository {
  get(tenantId: string, id: string): Promise<TenantAiContextRecord | null>;
  upsert(record: TenantAiContextRecord): Promise<TenantAiContextRecord>;
  delete(tenantId: string, id: string): Promise<void>;
}
