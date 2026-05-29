import { describe, expect, it, vi } from "vitest";

import { createTtlCache } from "./create-ttl-cache.js";

describe("createTtlCache", () => {
  it("returns cached values before ttl expires", () => {
    vi.useFakeTimers();
    const cache = createTtlCache<string, number>({ ttlMs: 1000 });

    cache.set("a", 1);
    expect(cache.get("a")).toBe(1);

    vi.advanceTimersByTime(999);
    expect(cache.get("a")).toBe(1);

    vi.advanceTimersByTime(1);
    expect(cache.get("a")).toBeUndefined();

    vi.useRealTimers();
  });

  it("invalidates entries explicitly", () => {
    const cache = createTtlCache<string, string>({ ttlMs: 60_000 });
    cache.set("user", "profile");
    expect(cache.has("user")).toBe(true);
    cache.delete("user");
    expect(cache.has("user")).toBe(false);
  });

  it("enforces max entries", () => {
    const cache = createTtlCache<number, string>({
      ttlMs: 60_000,
      maxEntries: 2,
    });
    cache.set(1, "one");
    cache.set(2, "two");
    cache.set(3, "three");

    expect(cache.get(1)).toBeUndefined();
    expect(cache.get(2)).toBe("two");
    expect(cache.get(3)).toBe("three");
  });

  it("clears all entries", () => {
    const cache = createTtlCache<string, string>({ ttlMs: 60_000 });
    cache.set("a", "1");
    cache.set("b", "2");
    cache.clear();
    expect(cache.get("a")).toBeUndefined();
    expect(cache.get("b")).toBeUndefined();
  });
});
