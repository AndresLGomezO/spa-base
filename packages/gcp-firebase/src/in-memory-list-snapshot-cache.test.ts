import { describe, expect, it, vi } from "vitest";

import {
  buildInMemoryListSnapshotCacheKey,
  buildInMemoryListSnapshotInvalidationPrefix,
  createInMemoryListSnapshotCache,
} from "./in-memory-list-snapshot-cache.js";
import { makeNormalizedEntityQuery } from "./test-normalized-query.js";

describe("buildInMemoryListSnapshotCacheKey", () => {
  it("includes tenant collection and ownership scope", () => {
    const key = buildInMemoryListSnapshotCacheKey({
      tenantId: "tenant_a",
      collection: "tags",
      tenantWideRead: false,
      query: makeNormalizedEntityQuery({
        filters: [
          {
            field: "accessUserIds",
            operator: "array-contains",
            value: "user_1",
          },
        ],
        postFilters: [],
        sort: null,
        limit: 25,
      }),
    });

    expect(key).toBe("tenant_a:tags:owner:user_1");
  });

  it("uses tenantWide scope when tenantWideRead", () => {
    const key = buildInMemoryListSnapshotCacheKey({
      tenantId: "tenant_a",
      collection: "boards",
      tenantWideRead: true,
      query: {
        filterTree: null,
        filters: [],
        postFilters: [],
        postFilterTree: null,
        sort: null,
        limit: 25,
      },
    });

    expect(key).toBe("tenant_a:boards:tenantWide");
  });
});

describe("createInMemoryListSnapshotCache", () => {
  it("reuses loaded snapshot within TTL", async () => {
    vi.useFakeTimers();
    const cache = createInMemoryListSnapshotCache({ ttlMs: 60_000 });
    const loader = vi.fn(async () => [{ id: "1" }]);

    const first = await cache.getOrLoad("k1", loader);
    const second = await cache.getOrLoad("k1", loader);

    expect(first).toEqual([{ id: "1" }]);
    expect(second).toEqual([{ id: "1" }]);
    expect(loader).toHaveBeenCalledTimes(1);

    vi.useRealTimers();
  });

  it("invalidates entries by tenant and collection prefix", async () => {
    const cache = createInMemoryListSnapshotCache({ ttlMs: 60_000 });
    const loader = vi.fn(async () => [{ id: "1" }]);

    await cache.getOrLoad("tenant_a:tags:owner:u1", loader);
    cache.invalidateByPrefix(
      buildInMemoryListSnapshotInvalidationPrefix("tenant_a", "tags"),
    );
    await cache.getOrLoad("tenant_a:tags:owner:u1", loader);

    expect(loader).toHaveBeenCalledTimes(2);
  });
});
