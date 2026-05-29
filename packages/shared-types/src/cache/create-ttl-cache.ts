export interface TtlCacheOptions {
  readonly ttlMs: number;
  readonly maxEntries?: number;
}

interface CacheEntry<V> {
  readonly value: V;
  readonly expiresAt: number;
}

export interface TtlCache<K, V> {
  get(key: K): V | undefined;
  set(key: K, value: V): void;
  delete(key: K): boolean;
  clear(): void;
  has(key: K): boolean;
}

export function createTtlCache<K, V>(options: TtlCacheOptions): TtlCache<K, V> {
  const store = new Map<K, CacheEntry<V>>();
  const ttlMs = Math.max(0, options.ttlMs);
  const maxEntries = options.maxEntries;

  function isExpired(entry: CacheEntry<V>, now: number): boolean {
    return now >= entry.expiresAt;
  }

  function pruneExpired(now: number): void {
    for (const [key, entry] of store.entries()) {
      if (isExpired(entry, now)) {
        store.delete(key);
      }
    }
  }

  function enforceMaxEntries(): void {
    if (maxEntries === undefined || store.size <= maxEntries) {
      return;
    }

    const overflow = store.size - maxEntries;
    const keys = store.keys();
    for (let index = 0; index < overflow; index += 1) {
      const next = keys.next();
      if (next.done) {
        break;
      }
      store.delete(next.value);
    }
  }

  return {
    get(key) {
      const now = Date.now();
      const entry = store.get(key);
      if (!entry) {
        return undefined;
      }
      if (isExpired(entry, now)) {
        store.delete(key);
        return undefined;
      }
      return entry.value;
    },
    set(key, value) {
      const now = Date.now();
      pruneExpired(now);
      store.set(key, {
        value,
        expiresAt: now + ttlMs,
      });
      enforceMaxEntries();
    },
    delete(key) {
      return store.delete(key);
    },
    clear() {
      store.clear();
    },
    has(key) {
      return this.get(key) !== undefined;
    },
  };
}
