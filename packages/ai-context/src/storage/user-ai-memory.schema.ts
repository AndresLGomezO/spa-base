import { z } from "zod";

export const USER_AI_MEMORIES_COLLECTION = "user_ai_memories";

export const userAiMemoryFactSchema = z.object({
  key: z.string().trim().min(1).max(200),
  value: z.string().trim().min(1).max(2000),
  entityRefs: z
    .array(
      z.object({
        entityName: z.string().trim().min(1),
        recordId: z.string().trim().min(1),
      }),
    )
    .max(20)
    .default([]),
  updatedAt: z.string().trim().min(1),
});

export type UserAiMemoryFact = z.infer<typeof userAiMemoryFactSchema>;

export const userAiMemoryRecordSchema = z.object({
  id: z.string().trim().min(1),
  tenantId: z.string().trim().min(1),
  userId: z.string().trim().min(1),
  profileFragment: z.string().max(4000).default(""),
  dataSnapshot: z.string().max(24_000).default(""),
  factIndex: z.array(userAiMemoryFactSchema).max(100).default([]),
  sourceHash: z.string().trim().min(1),
  prefixHash: z.string().trim().min(1).optional(),
  vertexCacheName: z.string().trim().min(1).nullable().optional(),
  vertexCacheExpireAt: z.string().trim().min(1).nullable().optional(),
  updatedAt: z.string().trim().min(1),
  createdAt: z.string().trim().min(1),
});

export type UserAiMemoryRecord = z.infer<typeof userAiMemoryRecordSchema>;

export interface UserAiMemoryRepository {
  get(tenantId: string, userId: string): Promise<UserAiMemoryRecord | null>;
  upsert(record: UserAiMemoryRecord): Promise<UserAiMemoryRecord>;
  delete(tenantId: string, userId: string): Promise<void>;
  /**
   * List memories updated at-or-after `sinceIso` (inclusive). Used by nightly refresh.
   */
  listUpdatedSince(
    tenantId: string,
    sinceIso: string,
  ): Promise<readonly UserAiMemoryRecord[]>;
  /**
   * Clear Vertex cache handles for all memories in a tenant (e.g. after L1 catalog sync).
   * Returns number of docs patched.
   */
  clearVertexCachesForTenant(tenantId: string): Promise<number>;
}
