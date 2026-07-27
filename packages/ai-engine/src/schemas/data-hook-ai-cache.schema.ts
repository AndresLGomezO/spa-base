import { z } from "zod";

export const DATA_HOOK_AI_CACHE_COLLECTION = "data_hook_ai_caches";

export const dataHookAiCacheRecordSchema = z.object({
  id: z.string().trim().min(1),
  tenantId: z.string().trim().min(1),
  hookId: z.string().trim().min(1),
  prefixHash: z.string().trim().min(1),
  cachedContentName: z.string().trim().min(1).nullable(),
  expireAt: z.string().trim().min(1).nullable(),
  updatedAt: z.string().trim().min(1),
});

export type DataHookAiCacheRecord = z.infer<typeof dataHookAiCacheRecordSchema>;

/** Document id = `${tenantId}:${hookId}` (sanitized for Firestore). */
export function dataHookAiCacheDocId(
  tenantId: string,
  hookId: string,
): string {
  return `${tenantId}__${hookId}`;
}
