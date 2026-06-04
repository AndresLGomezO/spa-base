import { vi } from "vitest";

export function buildInMemoryListSnapshotInvalidationPrefix(
  tenantId: string,
  collection: string,
): string {
  return `${tenantId}:${collection}:`;
}

export const mockCreateInMemoryListSnapshotCache = vi.fn(() => {
  const store = new Map<string, unknown>();

  return {
    getOrLoad: async (
      key: string,
      loader: () => Promise<unknown>,
    ): Promise<unknown> => {
      if (!store.has(key)) {
        store.set(key, await loader());
      }
      return store.get(key);
    },
    invalidateByPrefix: (prefix: string): void => {
      for (const key of store.keys()) {
        if (key.startsWith(prefix)) {
          store.delete(key);
        }
      }
    },
  };
});
