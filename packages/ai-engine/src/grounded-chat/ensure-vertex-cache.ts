import type {
  UserAiMemoryRecord,
  UserAiMemoryRepository,
} from "@repo/ai-context";

import type { VertexAiConfig } from "../vertex-ai.client.js";
import {
  VERTEX_CACHE_REFRESH_SKEW_MS,
  VERTEX_CACHE_TTL_SECONDS,
} from "./constants.js";
import type { AssembledGroundedChatPrefix } from "./assemble-prefix.js";
import type { VertexCachedContentClient } from "./vertex-cached-content.js";

export interface EnsureVertexCacheResult {
  readonly cachedContentName: string | null;
  readonly memory: UserAiMemoryRecord;
}

function cacheStillValid(
  memory: UserAiMemoryRecord,
  prefixHash: string,
  nowMs: number,
): boolean {
  if (!memory.vertexCacheName || !memory.vertexCacheExpireAt) {
    return false;
  }
  if (memory.prefixHash !== prefixHash) {
    return false;
  }
  const expireMs = Date.parse(memory.vertexCacheExpireAt);
  if (!Number.isFinite(expireMs)) {
    return false;
  }
  return expireMs - VERTEX_CACHE_REFRESH_SKEW_MS > nowMs;
}

/**
 * Ensure a Vertex CachedContent exists for L0–L2 prefix. Updates memory with
 * cache name / expiry / prefixHash. Falls back to null cache name on failure
 * (caller should send prefix as contextBlocks).
 */
export async function ensureVertexCacheForUserMemory(input: {
  readonly config: VertexAiConfig;
  readonly cacheClient: VertexCachedContentClient;
  readonly memoryRepository: UserAiMemoryRepository;
  readonly memory: UserAiMemoryRecord;
  readonly assembled: AssembledGroundedChatPrefix;
  readonly now?: () => Date;
}): Promise<EnsureVertexCacheResult> {
  const now = input.now ?? (() => new Date());
  const nowMs = now().getTime();

  if (cacheStillValid(input.memory, input.assembled.prefixHash, nowMs)) {
    return {
      cachedContentName: input.memory.vertexCacheName ?? null,
      memory: input.memory,
    };
  }

  if (input.memory.vertexCacheName) {
    try {
      await input.cacheClient.delete({
        config: input.config,
        name: input.memory.vertexCacheName,
      });
    } catch {
      // Best-effort delete; continue to recreate.
    }
  }

  try {
    const created = await input.cacheClient.create({
      config: input.config,
      modelId: input.config.modelId,
      systemInstruction: input.assembled.systemInstruction,
      prefixText: input.assembled.prefixText,
      ttlSeconds: VERTEX_CACHE_TTL_SECONDS,
      displayName: `qa-${input.memory.tenantId}-${input.memory.userId}`.slice(
        0,
        128,
      ),
    });

    const updated: UserAiMemoryRecord = {
      ...input.memory,
      vertexCacheName: created.name,
      vertexCacheExpireAt: created.expireTime,
      prefixHash: input.assembled.prefixHash,
      updatedAt: now().toISOString(),
    };
    const saved = await input.memoryRepository.upsert(updated);
    return { cachedContentName: created.name, memory: saved };
  } catch {
    const cleared: UserAiMemoryRecord = {
      ...input.memory,
      vertexCacheName: null,
      vertexCacheExpireAt: null,
      prefixHash: input.assembled.prefixHash,
      updatedAt: now().toISOString(),
    };
    const saved = await input.memoryRepository.upsert(cleared);
    return { cachedContentName: null, memory: saved };
  }
}
