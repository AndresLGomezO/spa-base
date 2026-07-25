import { describe, expect, it } from "vitest";
import type {
  TenantAiContextRecord,
  TenantAiContextRepository,
  UserAiMemoryRecord,
  UserAiMemoryRepository,
} from "@repo/ai-context";

import {
  assembleGroundedChatPrefix,
  createMockVertexCachedContentClient,
  ensureVertexCacheForUserMemory,
  executeGroundedChatTool,
  refreshUserAiMemory,
} from "./index.js";

function createMemoryRepo(): UserAiMemoryRepository {
  const store = new Map<string, UserAiMemoryRecord>();
  return {
    async get(tenantId, userId) {
      return store.get(`${tenantId}::${userId}`) ?? null;
    },
    async upsert(record) {
      store.set(`${record.tenantId}::${record.userId}`, record);
      return record;
    },
    async delete(tenantId, userId) {
      store.delete(`${tenantId}::${userId}`);
    },
    async listUpdatedSince(tenantId, sinceIso) {
      const out: UserAiMemoryRecord[] = [];
      for (const [k, v] of store) {
        if (!k.startsWith(`${tenantId}::`)) continue;
        if (v.updatedAt >= sinceIso) out.push(v);
      }
      return out;
    },
    async clearVertexCachesForTenant(tenantId) {
      let n = 0;
      for (const [k, v] of store) {
        if (!k.startsWith(`${tenantId}::`)) continue;
        if (v.vertexCacheName || v.vertexCacheExpireAt) {
          store.set(k, {
            ...v,
            vertexCacheName: null,
            vertexCacheExpireAt: null,
            updatedAt: new Date().toISOString(),
          });
          n += 1;
        }
      }
      return n;
    },
  };
}

function createContextRepo(): TenantAiContextRepository {
  const store = new Map<string, TenantAiContextRecord>();
  return {
    async get(tenantId, id) {
      return store.get(`${tenantId}::${id}`) ?? null;
    },
    async upsert(record) {
      store.set(`${record.tenantId}::${record.id}`, record);
      return record;
    },
    async delete(tenantId, id) {
      store.delete(`${tenantId}::${id}`);
    },
  };
}

describe("refreshUserAiMemory", () => {
  it("skips write when sourceHash is unchanged", async () => {
    const repository = createMemoryRepo();
    const source = {
      entitySummaries: [{ name: "transaction", label: "Transactions" }],
      metricSummaries: [{ id: "m1", name: "Spend" }],
    };

    const first = await refreshUserAiMemory({ repository }, "t1", "u1", source);
    expect(first.changed).toBe(true);

    const second = await refreshUserAiMemory(
      { repository },
      "t1",
      "u1",
      source,
    );
    expect(second.changed).toBe(false);
    expect(second.memory.sourceHash).toBe(first.memory.sourceHash);
  });

  it("clears vertex cache handles when content changes", async () => {
    const repository = createMemoryRepo();
    const first = await refreshUserAiMemory({ repository }, "t1", "u1", {
      entitySummaries: [{ name: "a" }],
    });
    await repository.upsert({
      ...first.memory,
      vertexCacheName: "projects/x/cachedContents/c1",
      vertexCacheExpireAt: new Date(Date.now() + 60_000).toISOString(),
    });

    const second = await refreshUserAiMemory({ repository }, "t1", "u1", {
      entitySummaries: [{ name: "b" }],
    });
    expect(second.changed).toBe(true);
    expect(second.memory.vertexCacheName).toBeNull();
  });
});

describe("assembleGroundedChatPrefix + ensureVertexCache", () => {
  it("creates a mock Vertex cache and reuses it while valid", async () => {
    const memoryRepo = createMemoryRepo();
    const contextRepo = createContextRepo();
    await contextRepo.upsert({
      id: "entityCatalog",
      tenantId: "t1",
      kind: "entityCatalog",
      sourceHash: "abc",
      fragments: { "entity.catalog": "Entities: transaction" },
      updatedAt: new Date().toISOString(),
    });

    const { memory } = await refreshUserAiMemory(
      { repository: memoryRepo },
      "t1",
      "u1",
      { entitySummaries: [{ name: "transaction" }] },
    );

    const assembled = assembleGroundedChatPrefix({
      entityCatalog: await contextRepo.get("t1", "entityCatalog"),
      memory,
    });

    const cacheClient = createMockVertexCachedContentClient();
    const first = await ensureVertexCacheForUserMemory({
      config: {
        projectId: "demo",
        region: "us-central1",
        modelId: "gemini-flash",
        mockEnabled: true,
      },
      cacheClient,
      memoryRepository: memoryRepo,
      memory,
      assembled,
    });
    expect(first.cachedContentName).toMatch(/cachedContents\/mock-/);

    const second = await ensureVertexCacheForUserMemory({
      config: {
        projectId: "demo",
        region: "us-central1",
        modelId: "gemini-flash",
        mockEnabled: true,
      },
      cacheClient,
      memoryRepository: memoryRepo,
      memory: first.memory,
      assembled,
    });
    expect(second.cachedContentName).toBe(first.cachedContentName);
  });
});

describe("executeGroundedChatTool RBAC", () => {
  it("returns only records visible to the user", async () => {
    const result = await executeGroundedChatTool(
      {
        listEntities: async () => [],
        listMetrics: async () => [],
        listQueries: async () => [],
        searchRecords: async (_t, userId) =>
          userId === "u1"
            ? [
                {
                  entityName: "transaction",
                  recordId: "r1",
                  label: "Coffee",
                  fields: { id: "r1", amount: 5 },
                },
              ]
            : [],
        getRecord: async () => null,
        getUserMemoryFacts: async () => [],
      },
      "t1",
      "u1",
      {
        name: "searchRecords",
        args: { entityName: "transaction", q: "coffee" },
      },
    );
    expect(result.ok).toBe(true);
    expect(result.citations).toHaveLength(1);
    expect(result.citations[0]?.recordId).toBe("r1");
  });
});
