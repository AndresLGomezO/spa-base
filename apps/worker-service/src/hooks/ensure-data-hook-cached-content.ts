import { createHash } from "node:crypto";

import type { VertexAiConfig } from "@repo/ai-engine/vertex-ai.client";
import {
  VERTEX_CACHE_REFRESH_SKEW_MS,
  VERTEX_CACHE_TTL_SECONDS,
  type VertexCachedContentClient,
} from "@repo/ai-engine/grounded-chat";
import {
  dataHookAiCacheDocId,
  type DataHookAiCacheRecord,
  type DataHookAiCacheRepository,
} from "@repo/firestore-converters/data-hook-ai-cache";

export interface EnsureDataHookCachedContentResult {
  readonly cachedContentName: string | null;
  readonly record: DataHookAiCacheRecord;
}

export function hashDataHookAiPrefix(input: {
  readonly systemInstruction: string;
  readonly prefixText: string;
}): string {
  return createHash("sha256")
    .update(input.systemInstruction)
    .update("\0")
    .update(input.prefixText)
    .digest("hex");
}

function cacheStillValid(
  record: DataHookAiCacheRecord,
  prefixHash: string,
  nowMs: number,
): boolean {
  if (!record.cachedContentName || !record.expireAt) {
    return false;
  }
  if (record.prefixHash !== prefixHash) {
    return false;
  }
  const expireMs = Date.parse(record.expireAt);
  if (!Number.isFinite(expireMs)) {
    return false;
  }
  return expireMs - VERTEX_CACHE_REFRESH_SKEW_MS > nowMs;
}

/**
 * Ensure a Vertex CachedContent exists for the classify catalog + system
 * instruction. Falls back to null name on create failure (caller inlines prefix).
 */
export async function ensureDataHookCachedContent(input: {
  readonly config: VertexAiConfig;
  readonly cacheClient: VertexCachedContentClient;
  readonly cacheRepository: DataHookAiCacheRepository;
  readonly tenantId: string;
  readonly hookId: string;
  readonly systemInstruction: string;
  readonly prefixText: string;
  readonly prefixHash?: string;
  readonly now?: () => Date;
}): Promise<EnsureDataHookCachedContentResult> {
  const now = input.now ?? (() => new Date());
  const nowMs = now().getTime();
  const prefixHash =
    input.prefixHash ??
    hashDataHookAiPrefix({
      systemInstruction: input.systemInstruction,
      prefixText: input.prefixText,
    });
  const id = dataHookAiCacheDocId(input.tenantId, input.hookId);
  const existing = await input.cacheRepository.getById(input.tenantId, id);
  const current: DataHookAiCacheRecord = existing ?? {
    id,
    tenantId: input.tenantId,
    hookId: input.hookId,
    prefixHash,
    cachedContentName: null,
    expireAt: null,
    updatedAt: now().toISOString(),
  };

  if (cacheStillValid(current, prefixHash, nowMs)) {
    return {
      cachedContentName: current.cachedContentName,
      record: current,
    };
  }

  if (current.cachedContentName) {
    try {
      await input.cacheClient.delete({
        config: input.config,
        name: current.cachedContentName,
      });
    } catch {
      // Best-effort delete; continue to recreate.
    }
  }

  try {
    const created = await input.cacheClient.create({
      config: input.config,
      modelId: input.config.modelId,
      systemInstruction: input.systemInstruction,
      prefixText: input.prefixText || "(empty classify catalog)",
      ttlSeconds: VERTEX_CACHE_TTL_SECONDS,
      displayName: `dh-${input.tenantId}-${input.hookId}`.slice(0, 128),
    });

    const updated: DataHookAiCacheRecord = {
      ...current,
      prefixHash,
      cachedContentName: created.name,
      expireAt: created.expireTime,
      updatedAt: now().toISOString(),
    };
    const saved = await input.cacheRepository.upsert(updated);
    return { cachedContentName: created.name, record: saved };
  } catch {
    const cleared: DataHookAiCacheRecord = {
      ...current,
      prefixHash,
      cachedContentName: null,
      expireAt: null,
      updatedAt: now().toISOString(),
    };
    const saved = await input.cacheRepository.upsert(cleared);
    return { cachedContentName: null, record: saved };
  }
}
