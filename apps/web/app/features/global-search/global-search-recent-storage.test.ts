import { describe, expect, it } from "vitest";

import { buildGlobalSearchQueryHit } from "./build-global-search-query-hit";
import {
  GLOBAL_SEARCH_RECENT_STORAGE_KEY,
  pushGlobalSearchRecent,
  readGlobalSearchRecent,
  removeGlobalSearchRecent,
} from "./global-search-recent-storage";
import type { GlobalSearchHit } from "./global-search-types";

function createMemoryStorage(initial: Record<string, string> = {}): Storage {
  const store = { ...initial };
  return {
    get length() {
      return Object.keys(store).length;
    },
    clear() {
      for (const key of Object.keys(store)) {
        delete store[key];
      }
    },
    getItem(key: string) {
      return store[key] ?? null;
    },
    key() {
      return null;
    },
    removeItem(key: string) {
      delete store[key];
    },
    setItem(key: string, value: string) {
      store[key] = value;
    },
  };
}

const homeHit: GlobalSearchHit = {
  id: "feature-home",
  section: "features",
  label: "Home",
  to: "/",
  iconName: "Home",
};

const chatHit: GlobalSearchHit = {
  id: "feature-ai-chat",
  section: "features",
  label: "AI Chat",
  to: "/ai/chat",
  iconName: "Bot",
};

const accountsHit: GlobalSearchHit = {
  id: "entity-actor",
  section: "entities",
  label: "Accounts",
  to: "/app/actor",
  iconName: "Users",
};

const viewsHit: GlobalSearchHit = {
  id: "view-upcoming",
  section: "views",
  label: "Upcoming",
  to: "/app/views/upcoming-payments",
};

describe("global-search-recent-storage", () => {
  it("returns empty when storage is missing or invalid", () => {
    const storage = createMemoryStorage();
    expect(readGlobalSearchRecent(storage)).toEqual([]);

    storage.setItem(GLOBAL_SEARCH_RECENT_STORAGE_KEY, "{not-json");
    expect(readGlobalSearchRecent(storage)).toEqual([]);

    storage.setItem(GLOBAL_SEARCH_RECENT_STORAGE_KEY, JSON.stringify({ a: 1 }));
    expect(readGlobalSearchRecent(storage)).toEqual([]);
  });

  it("dedupes by id and caps at 50", () => {
    const storage = createMemoryStorage();

    pushGlobalSearchRecent(homeHit, [], 1000, storage);
    pushGlobalSearchRecent(
      chatHit,
      readGlobalSearchRecent(storage),
      2000,
      storage,
    );
    pushGlobalSearchRecent(
      accountsHit,
      readGlobalSearchRecent(storage),
      3000,
      storage,
    );
    pushGlobalSearchRecent(
      viewsHit,
      readGlobalSearchRecent(storage),
      4000,
      storage,
    );
    pushGlobalSearchRecent(
      homeHit,
      readGlobalSearchRecent(storage),
      5000,
      storage,
    );

    const recent = readGlobalSearchRecent(storage);
    expect(recent).toHaveLength(4);
    expect(recent.map((entry) => entry.id)).toEqual([
      "feature-home",
      "view-upcoming",
      "entity-actor",
      "feature-ai-chat",
    ]);
    expect(recent[0]?.at).toBe(5000);

    let existing = recent;
    for (let index = 0; index < 60; index += 1) {
      existing = pushGlobalSearchRecent(
        {
          id: `feature-${index}`,
          section: "features",
          label: `Feature ${index}`,
          to: `/f/${index}`,
        },
        existing,
        6000 + index,
        storage,
      );
    }
    expect(readGlobalSearchRecent(storage)).toHaveLength(50);
  });

  it("removes a recent entry by id", () => {
    const storage = createMemoryStorage();
    pushGlobalSearchRecent(homeHit, [], 1000, storage);
    pushGlobalSearchRecent(
      chatHit,
      readGlobalSearchRecent(storage),
      2000,
      storage,
    );

    const next = removeGlobalSearchRecent(
      "feature-home",
      readGlobalSearchRecent(storage),
      storage,
    );
    expect(next.map((entry) => entry.id)).toEqual(["feature-ai-chat"]);
    expect(readGlobalSearchRecent(storage).map((entry) => entry.id)).toEqual([
      "feature-ai-chat",
    ]);
  });

  it("persists text query searches and dedupes case-insensitively", () => {
    const storage = createMemoryStorage();
    const first = buildGlobalSearchQueryHit("Acme")!;
    const second = buildGlobalSearchQueryHit("acme")!;

    pushGlobalSearchRecent(first, [], 1000, storage);
    pushGlobalSearchRecent(
      second,
      readGlobalSearchRecent(storage),
      2000,
      storage,
    );

    const recent = readGlobalSearchRecent(storage);
    expect(recent).toHaveLength(1);
    expect(recent[0]).toMatchObject({
      id: "query:acme",
      section: "queries",
      label: "acme",
      to: "/search?q=acme",
      at: 2000,
    });
  });
});
