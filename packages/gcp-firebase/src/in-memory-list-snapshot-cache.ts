import { createTtlCache } from "@repo/shared-types";
import type { NormalizedEntityQuery } from "@repo/firestore-converters";

export type InMemoryListSnapshot = readonly Record<string, unknown>[];

export interface InMemoryListSnapshotCacheKeyInput {
  readonly tenantId: string;
  readonly collection: string;
  readonly tenantWideRead: boolean;
  readonly query: NormalizedEntityQuery;
}

export interface InMemoryListSnapshotCache {
  getOrLoad(
    key: string,
    loader: () => Promise<InMemoryListSnapshot>,
  ): Promise<InMemoryListSnapshot>;
  invalidateByPrefix(prefix: string): void;
}

export function buildOwnershipScope(
  query: NormalizedEntityQuery,
  tenantWideRead: boolean,
): string {
  if (tenantWideRead) {
    return "tenantWide";
  }

  const ownershipFilter = query.filters.find(
    (filter) =>
      filter.field === "accessUserIds" && filter.operator === "array-contains",
  );

  if (!ownershipFilter) {
    return "noOwnership";
  }

  return `owner:${String(ownershipFilter.value)}`;
}

export function buildInMemoryListSnapshotCacheKey(
  input: InMemoryListSnapshotCacheKeyInput,
): string {
  const ownershipScope = buildOwnershipScope(input.query, input.tenantWideRead);
  return `${input.tenantId}:${input.collection}:${ownershipScope}`;
}

export function buildInMemoryListSnapshotInvalidationPrefix(
  tenantId: string,
  collection: string,
): string {
  return `${tenantId}:${collection}:`;
}

export function createInMemoryListSnapshotCache(options: {
  readonly ttlMs: number;
}): InMemoryListSnapshotCache {
  const ttlMs = Math.max(0, options.ttlMs);
  const store = createTtlCache<string, InMemoryListSnapshot>({ ttlMs });
  const keys = new Set<string>();

  return {
    async getOrLoad(key, loader) {
      const cached = store.get(key);
      if (cached) {
        return cached;
      }

      const loaded = await loader();
      store.set(key, loaded);
      keys.add(key);
      return loaded;
    },
    invalidateByPrefix(prefix) {
      for (const key of keys) {
        if (key.startsWith(prefix)) {
          store.delete(key);
          keys.delete(key);
        }
      }
    },
  };
}
