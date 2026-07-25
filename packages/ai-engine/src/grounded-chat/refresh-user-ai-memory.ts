import {
  hashSourceValue,
  truncateText,
  type UserAiMemoryFact,
  type UserAiMemoryRecord,
  type UserAiMemoryRepository,
} from "@repo/ai-context";

import { USER_AI_MEMORY_SNAPSHOT_MAX_CHARS } from "./constants.js";

export interface UserAiMemoryRefreshSource {
  readonly entitySummaries: readonly {
    readonly name: string;
    readonly label?: string;
    readonly recordCount?: number;
  }[];
  readonly metricSummaries?: readonly {
    readonly id: string;
    readonly name: string;
  }[];
  readonly querySummaries?: readonly {
    readonly id: string;
    readonly name: string;
    readonly entityName?: string;
  }[];
  readonly profileFragment?: string;
  readonly extraFacts?: readonly UserAiMemoryFact[];
  /**
   * When provided (from resolved AI context sections), replaces the auto
   * catalog overview snapshot. Empty string falls back to catalog overview.
   */
  readonly assembledSectionsText?: string;
}

export interface RefreshUserAiMemoryDeps {
  readonly repository: UserAiMemoryRepository;
  readonly now?: () => Date;
}

function buildDataSnapshot(source: UserAiMemoryRefreshSource): string {
  const lines: string[] = [
    "Visible catalog overview for this user (counts may be approximate):",
  ];
  for (const entity of source.entitySummaries) {
    const label = entity.label?.trim() || entity.name;
    const count =
      typeof entity.recordCount === "number"
        ? ` (~${entity.recordCount} records visible)`
        : "";
    lines.push(`- Entity ${label} (${entity.name})${count}`);
  }
  if (source.metricSummaries && source.metricSummaries.length > 0) {
    lines.push("Metrics:");
    for (const metric of source.metricSummaries) {
      lines.push(`- ${metric.name} [${metric.id}]`);
    }
  }
  if (source.querySummaries && source.querySummaries.length > 0) {
    lines.push("Saved queries:");
    for (const query of source.querySummaries) {
      const entity = query.entityName ? ` on ${query.entityName}` : "";
      lines.push(`- ${query.name} [${query.id}]${entity}`);
    }
  }
  return truncateText(lines.join("\n"), USER_AI_MEMORY_SNAPSHOT_MAX_CHARS);
}

/**
 * Hash-gated L2 memory upsert. Skips write when sourceHash is unchanged
 * (unless force). Clears Vertex cache handles when content changes.
 */
export async function refreshUserAiMemory(
  deps: RefreshUserAiMemoryDeps,
  tenantId: string,
  userId: string,
  source: UserAiMemoryRefreshSource,
  options?: { readonly force?: boolean },
): Promise<{
  readonly memory: UserAiMemoryRecord;
  readonly changed: boolean;
}> {
  const now = (deps.now ?? (() => new Date()))().toISOString();
  const profileFragment = source.profileFragment?.trim() ?? "";
  const assembled = source.assembledSectionsText?.trim() ?? "";
  const dataSnapshot = truncateText(
    assembled.length > 0 ? assembled : buildDataSnapshot(source),
    USER_AI_MEMORY_SNAPSHOT_MAX_CHARS,
  );
  const factIndex = [...(source.extraFacts ?? [])];
  const sourceHash = hashSourceValue({
    profileFragment,
    dataSnapshot,
    factIndex,
  });

  const existing = await deps.repository.get(tenantId, userId);
  if (existing && existing.sourceHash === sourceHash && !options?.force) {
    return { memory: existing, changed: false };
  }

  const memory: UserAiMemoryRecord = {
    id: userId,
    tenantId,
    userId,
    profileFragment,
    dataSnapshot,
    factIndex,
    sourceHash,
    vertexCacheName: null,
    vertexCacheExpireAt: null,
    prefixHash: undefined,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };

  const saved = await deps.repository.upsert(memory);
  return { memory: saved, changed: true };
}

/**
 * Mark all tenant user memories' Vertex caches invalid after L1 catalog changes.
 */
export async function invalidateUserAiMemoryCachesForTenant(
  repository: UserAiMemoryRepository,
  tenantId: string,
): Promise<number> {
  return repository.clearVertexCachesForTenant(tenantId);
}
