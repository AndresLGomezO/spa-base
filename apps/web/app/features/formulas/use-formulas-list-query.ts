import { useCallback, useMemo } from "react";
import { useSearchParams } from "react-router";

import type { FormulaDefinitionRecord } from "../../lib/api-client";
import {
  DEFAULT_FORMULA_LIST_SORT,
  FORMULA_SOURCE_FILTERS,
  FORMULA_STATUS_FILTERS,
  formulaSortLabelKey,
  formulaSourceLabelKey,
  formulaStatusLabelKey,
  isFormulaListSort,
  type FormulaListSort,
  type FormulaSourceFilter,
  type FormulaStatusFilter,
} from "./formula-list-styles";

interface FormulasListQuery {
  readonly search: string;
  readonly sources: readonly FormulaSourceFilter[];
  readonly statuses: readonly FormulaStatusFilter[];
  readonly sort: FormulaListSort;
}

interface FormulasListFilterBadge {
  readonly id: string;
  readonly label: string;
  readonly onRemove: () => void;
}

function parseSources(raw: string | null): FormulaSourceFilter[] {
  if (!raw?.trim()) {
    return [];
  }

  const allowed = new Set<string>(FORMULA_SOURCE_FILTERS);
  return raw
    .split(",")
    .map((entry) => entry.trim())
    .filter((entry): entry is FormulaSourceFilter =>
      allowed.has(entry),
    );
}

function parseStatuses(raw: string | null): FormulaStatusFilter[] {
  if (!raw?.trim()) {
    return [];
  }

  const allowed = new Set<string>(FORMULA_STATUS_FILTERS);
  return raw
    .split(",")
    .map((entry) => entry.trim())
    .filter((entry): entry is FormulaStatusFilter =>
      allowed.has(entry),
    );
}

function formulaSearchHaystack(definition: FormulaDefinitionRecord): string {
  return [
    definition.name,
    definition.description ?? "",
    definition.id,
  ]
    .join(" ")
    .toLowerCase();
}

function definitionMatchesStatusFilter(
  definition: FormulaDefinitionRecord,
  status: FormulaStatusFilter,
): boolean {
  return status === "enabled" ? definition.enabled : !definition.enabled;
}

function sortFormulaDefinitions(
  definitions: readonly FormulaDefinitionRecord[],
  sort: FormulaListSort,
): FormulaDefinitionRecord[] {
  const sorted = [...definitions];

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
        right.updatedAt.localeCompare(left.updatedAt),
      );
      break;
    case "nameAsc":
    default:
      sorted.sort((left, right) => left.name.localeCompare(right.name));
      break;
  }

  return sorted;
}

export function useFormulasListQuery(
  definitions: readonly FormulaDefinitionRecord[],
) {
  const [searchParams, setSearchParams] = useSearchParams();

  const query = useMemo((): FormulasListQuery => {
    const rawSort = searchParams.get("sort") ?? DEFAULT_FORMULA_LIST_SORT;
    return {
      search: searchParams.get("q")?.trim() ?? "",
      sources: parseSources(searchParams.get("source")),
      statuses: parseStatuses(searchParams.get("status")),
      sort: isFormulaListSort(rawSort) ? rawSort : DEFAULT_FORMULA_LIST_SORT,
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
    (sort: FormulaListSort) => {
      updateSearchParams((next) => {
        if (sort === DEFAULT_FORMULA_LIST_SORT) {
          next.delete("sort");
        } else {
          next.set("sort", sort);
        }
      });
    },
    [updateSearchParams],
  );

  const toggleSource = useCallback(
    (source: FormulaSourceFilter) => {
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

  const toggleStatus = useCallback(
    (status: FormulaStatusFilter) => {
      updateSearchParams((next) => {
        const current = parseStatuses(next.get("status"));
        const exists = current.includes(status);
        const updated = exists
          ? current.filter((entry) => entry !== status)
          : [...current, status];

        if (updated.length === 0) {
          next.delete("status");
        } else {
          next.set("status", updated.join(","));
        }
      });
    },
    [updateSearchParams],
  );

  const clearFilters = useCallback(() => {
    updateSearchParams((next) => {
      next.delete("q");
      next.delete("source");
      next.delete("status");
      next.delete("sort");
    });
  }, [updateSearchParams]);

  const filteredDefinitions = useMemo(() => {
    const searchNeedle = query.search.toLowerCase();

    return definitions.filter((definition) => {
      if (
        query.sources.length > 0 &&
        !query.sources.includes(definition.source)
      ) {
        return false;
      }

      if (
        query.statuses.length > 0 &&
        !query.statuses.some((status) =>
          definitionMatchesStatusFilter(definition, status),
        )
      ) {
        return false;
      }

      if (searchNeedle.length === 0) {
        return true;
      }

      return formulaSearchHaystack(definition).includes(searchNeedle);
    });
  }, [definitions, query.search, query.sources, query.statuses]);

  const listDefinitions = useMemo(
    () => sortFormulaDefinitions(filteredDefinitions, query.sort),
    [filteredDefinitions, query.sort],
  );

  const sourceCounts = useMemo(() => {
    const counts: Partial<Record<FormulaSourceFilter, number>> = {};

    for (const definition of filteredDefinitions) {
      counts[definition.source] = (counts[definition.source] ?? 0) + 1;
    }

    return counts;
  }, [filteredDefinitions]);

  const statusCounts = useMemo(() => {
    const counts: Partial<Record<FormulaStatusFilter, number>> = {};

    for (const definition of filteredDefinitions) {
      const status: FormulaStatusFilter = definition.enabled
        ? "enabled"
        : "disabled";
      counts[status] = (counts[status] ?? 0) + 1;
    }

    return counts;
  }, [filteredDefinitions]);

  const hasActiveFilters =
    query.search.length > 0 ||
    query.sources.length > 0 ||
    query.statuses.length > 0 ||
    query.sort !== DEFAULT_FORMULA_LIST_SORT;

  const activeFilterBadges = useMemo((): FormulasListFilterBadge[] => {
    const badges: FormulasListFilterBadge[] = [];

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

    for (const status of query.statuses) {
      badges.push({
        id: `status:${status}`,
        label: status,
        onRemove: () => toggleStatus(status),
      });
    }

    if (query.sort !== DEFAULT_FORMULA_LIST_SORT) {
      badges.push({
        id: "sort",
        label: query.sort,
        onRemove: () => setSort(DEFAULT_FORMULA_LIST_SORT),
      });
    }

    return badges;
  }, [
    query.search,
    query.sort,
    query.sources,
    query.statuses,
    setSearch,
    setSort,
    toggleSource,
    toggleStatus,
  ]);

  return {
    query,
    listDefinitions,
    filteredDefinitions,
    sourceCounts,
    statusCounts,
    hasActiveFilters,
    activeFilterBadges,
    setSearch,
    setSort,
    toggleSource,
    toggleStatus,
    clearFilters,
    formulaSourceLabelKey,
    formulaStatusLabelKey,
    formulaSortLabelKey,
  };
}
