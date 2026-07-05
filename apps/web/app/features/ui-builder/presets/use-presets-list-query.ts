import { useCallback, useMemo } from "react";
import { useSearchParams } from "react-router";

import type { PresetCatalogEntry } from "./preset-catalog-entry";
import type { PresetSourceFilter } from "./preset-catalog-entry";
import {
  DEFAULT_PRESET_LIST_SORT,
  isPresetListSort,
  PRESET_SOURCE_FILTERS,
  presetSortLabelKey,
  presetSourceLabelKey,
  type PresetListSort,
} from "./preset-list-styles";

interface PresetsListQuery {
  readonly search: string;
  readonly sources: readonly PresetSourceFilter[];
  readonly sort: PresetListSort;
}

interface PresetsListFilterBadge {
  readonly id: string;
  readonly label: string;
  readonly onRemove: () => void;
}

function parseSources(raw: string | null): PresetSourceFilter[] {
  if (!raw?.trim()) {
    return [];
  }

  const allowed = new Set<string>(PRESET_SOURCE_FILTERS);
  return raw
    .split(",")
    .map((entry) => entry.trim())
    .filter((entry): entry is PresetSourceFilter => allowed.has(entry));
}

function presetSearchHaystack(entry: PresetCatalogEntry): string {
  return [
    entry.name,
    entry.description ?? "",
    entry.kind,
    entry.designSurface ?? "",
    entry.builtinId ?? "",
    entry.id,
  ]
    .join(" ")
    .toLowerCase();
}

function sortPresetEntries(
  entries: readonly PresetCatalogEntry[],
  sort: PresetListSort,
): PresetCatalogEntry[] {
  const sorted = [...entries];

  switch (sort) {
    case "nameDesc":
      sorted.sort((left, right) => right.name.localeCompare(left.name));
      break;
    case "source":
      sorted.sort(
        (left, right) =>
          left.source.localeCompare(right.source) ||
          left.name.localeCompare(right.name),
      );
      break;
    case "updatedDesc":
      sorted.sort((left, right) =>
        (right.updatedAt ?? "").localeCompare(left.updatedAt ?? ""),
      );
      break;
    case "nameAsc":
    default:
      sorted.sort((left, right) => {
        if (left.isDefault && !right.isDefault) {
          return -1;
        }
        if (!left.isDefault && right.isDefault) {
          return 1;
        }
        return left.name.localeCompare(right.name);
      });
      break;
  }

  return sorted;
}

export function usePresetsListQuery(entries: readonly PresetCatalogEntry[]) {
  const [searchParams, setSearchParams] = useSearchParams();

  const query = useMemo((): PresetsListQuery => {
    const rawSort = searchParams.get("sort") ?? DEFAULT_PRESET_LIST_SORT;
    return {
      search: searchParams.get("q")?.trim() ?? "",
      sources: parseSources(searchParams.get("source")),
      sort: isPresetListSort(rawSort) ? rawSort : DEFAULT_PRESET_LIST_SORT,
    };
  }, [searchParams]);

  const updateSearchParams = useCallback(
    (updater: (next: URLSearchParams) => void) => {
      const next = new URLSearchParams(searchParams);
      updater(next);
      setSearchParams(next, { replace: true });
    },
    [searchParams, setSearchParams],
  );

  const setSearch = useCallback(
    (search: string) => {
      updateSearchParams((next) => {
        const trimmed = search.trim();
        if (trimmed.length === 0) {
          next.delete("q");
        } else {
          next.set("q", trimmed);
        }
      });
    },
    [updateSearchParams],
  );

  const setSort = useCallback(
    (sort: PresetListSort) => {
      updateSearchParams((next) => {
        if (sort === DEFAULT_PRESET_LIST_SORT) {
          next.delete("sort");
        } else {
          next.set("sort", sort);
        }
      });
    },
    [updateSearchParams],
  );

  const toggleSource = useCallback(
    (source: PresetSourceFilter) => {
      updateSearchParams((next) => {
        const current = parseSources(next.get("source"));
        const exists = current.includes(source);
        const updated = exists
          ? current.filter((entry) => entry !== source)
          : [...current, source];

        if (updated.length === 0) {
          next.delete("source");
        } else {
          next.set("source", updated.join(","));
        }
      });
    },
    [updateSearchParams],
  );

  const clearFilters = useCallback(() => {
    updateSearchParams((next) => {
      next.delete("q");
      next.delete("source");
      next.delete("sort");
    });
  }, [updateSearchParams]);

  const filteredEntries = useMemo(() => {
    const searchNeedle = query.search.toLowerCase();

    return entries.filter((entry) => {
      if (query.sources.length > 0 && !query.sources.includes(entry.source)) {
        return false;
      }

      if (searchNeedle.length === 0) {
        return true;
      }

      return presetSearchHaystack(entry).includes(searchNeedle);
    });
  }, [entries, query.search, query.sources]);

  const listEntries = useMemo(
    () => sortPresetEntries(filteredEntries, query.sort),
    [filteredEntries, query.sort],
  );

  const sourceCounts = useMemo(() => {
    const counts: Partial<Record<PresetSourceFilter, number>> = {};

    for (const entry of filteredEntries) {
      counts[entry.source] = (counts[entry.source] ?? 0) + 1;
    }

    return counts;
  }, [filteredEntries]);

  const hasActiveFilters =
    query.search.length > 0 ||
    query.sources.length > 0 ||
    query.sort !== DEFAULT_PRESET_LIST_SORT;

  const activeFilterBadges = useMemo((): PresetsListFilterBadge[] => {
    const badges: PresetsListFilterBadge[] = [];

    if (query.search.length > 0) {
      badges.push({
        id: "search",
        label: query.search,
        onRemove: () => setSearch(""),
      });
    }

    for (const source of query.sources) {
      badges.push({
        id: `source:${source}`,
        label: source,
        onRemove: () => toggleSource(source),
      });
    }

    if (query.sort !== DEFAULT_PRESET_LIST_SORT) {
      badges.push({
        id: "sort",
        label: query.sort,
        onRemove: () => setSort(DEFAULT_PRESET_LIST_SORT),
      });
    }

    return badges;
  }, [
    query.search,
    query.sort,
    query.sources,
    setSearch,
    setSort,
    toggleSource,
  ]);

  return {
    query,
    listEntries,
    filteredEntries,
    sourceCounts,
    hasActiveFilters,
    activeFilterBadges,
    setSearch,
    setSort,
    toggleSource,
    clearFilters,
    presetSourceLabelKey,
    presetSortLabelKey,
  };
}
