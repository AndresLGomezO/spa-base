import {
  userAiMemoryRecordSchema,
  type UserAiMemoryRecord,
  type UserAiMemoryRepository,
} from "./repository-contract.js";

export function createInMemoryUserAiMemoryRepository(): UserAiMemoryRepository {
  const store = new Map<string, UserAiMemoryRecord>();

  function key(tenantId: string, userId: string): string {
    return `${tenantId}::${userId}`;
  }

  return {
    async get(tenantId, userId) {
      return store.get(key(tenantId, userId)) ?? null;
    },
    async upsert(record) {
      const parsed = userAiMemoryRecordSchema.parse(record);
      store.set(key(parsed.tenantId, parsed.userId), parsed);
      return parsed;
    },
    async delete(tenantId, userId) {
      store.delete(key(tenantId, userId));
    },
    async listUpdatedSince(tenantId, sinceIso) {
      const out: UserAiMemoryRecord[] = [];
      for (const [k, record] of store) {
        if (!k.startsWith(`${tenantId}::`)) continue;
        if (record.updatedAt >= sinceIso) {
          out.push(record);
        }
      }
      return out;
    },
    async clearVertexCachesForTenant(tenantId) {
      let count = 0;
      for (const [k, record] of store) {
        if (!k.startsWith(`${tenantId}::`)) continue;
        if (record.vertexCacheName || record.vertexCacheExpireAt) {
          store.set(k, {
            ...record,
            vertexCacheName: null,
            vertexCacheExpireAt: null,
            updatedAt: new Date().toISOString(),
          });
          count += 1;
        }
      }
      return count;
    },
  };
}
