import {
  GLOBAL_SEARCH_RECENT_MAX,
  type GlobalSearchHit,
  type GlobalSearchRecentEntry,
} from "./global-search-types";

export const GLOBAL_SEARCH_RECENT_STORAGE_KEY = "global-search:recent";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function parseRecentEntry(value: unknown): GlobalSearchRecentEntry | null {
  if (!isRecord(value)) {
    return null;
  }
  const { id, section, label, to, at } = value;
  if (
    typeof id !== "string" ||
    typeof label !== "string" ||
    typeof to !== "string" ||
    typeof at !== "number" ||
    (section !== "entities" &&
      section !== "features" &&
      section !== "views" &&
      section !== "queries")
  ) {
    return null;
  }

  const description =
    typeof value.description === "string" ? value.description : undefined;
  const snippet = typeof value.snippet === "string" ? value.snippet : undefined;
  const iconName =
    typeof value.iconName === "string" ? value.iconName : undefined;
  const imageUrl =
    typeof value.imageUrl === "string" ? value.imageUrl : undefined;
  const entityName =
    typeof value.entityName === "string" && value.entityName.trim().length > 0
      ? value.entityName
      : undefined;

  return {
    id,
    section,
    label,
    to,
    at,
    ...(description ? { description } : {}),
    ...(snippet ? { snippet } : {}),
    ...(iconName ? { iconName } : {}),
    ...(imageUrl ? { imageUrl } : {}),
    ...(entityName ? { entityName } : {}),
  };
}

export function readGlobalSearchRecent(
  storage: Pick<Storage, "getItem"> = localStorage,
): readonly GlobalSearchRecentEntry[] {
  try {
    const raw = storage.getItem(GLOBAL_SEARCH_RECENT_STORAGE_KEY);
    if (!raw) {
      return [];
    }
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed
      .map(parseRecentEntry)
      .filter((entry): entry is GlobalSearchRecentEntry => entry != null)
      .slice(0, GLOBAL_SEARCH_RECENT_MAX);
  } catch {
    return [];
  }
}

function writeGlobalSearchRecent(
  entries: readonly GlobalSearchRecentEntry[],
  storage: Pick<Storage, "setItem"> = localStorage,
): void {
  try {
    storage.setItem(
      GLOBAL_SEARCH_RECENT_STORAGE_KEY,
      JSON.stringify(entries.slice(0, GLOBAL_SEARCH_RECENT_MAX)),
    );
  } catch {
    // Ignore quota / private-mode failures.
  }
}

export function pushGlobalSearchRecent(
  hit: GlobalSearchHit,
  existing: readonly GlobalSearchRecentEntry[] = readGlobalSearchRecent(),
  now = Date.now(),
  storage: Pick<Storage, "setItem"> = localStorage,
): readonly GlobalSearchRecentEntry[] {
  const next: GlobalSearchRecentEntry[] = [
    { ...hit, at: now },
    ...existing.filter((entry) => entry.id !== hit.id),
  ].slice(0, GLOBAL_SEARCH_RECENT_MAX);

  writeGlobalSearchRecent(next, storage);
  return next;
}

export function removeGlobalSearchRecent(
  hitId: string,
  existing: readonly GlobalSearchRecentEntry[] = readGlobalSearchRecent(),
  storage: Pick<Storage, "setItem"> = localStorage,
): readonly GlobalSearchRecentEntry[] {
  const next = existing.filter((entry) => entry.id !== hitId);
  writeGlobalSearchRecent(next, storage);
  return next;
}
