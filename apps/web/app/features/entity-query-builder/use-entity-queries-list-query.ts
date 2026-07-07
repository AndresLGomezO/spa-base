import { useCallback, useMemo } from "react";
import { useSearchParams } from "react-router";

import type { EntityQueryDefinitionRecord } from "../../lib/api-client";
import {
  DEFAULT_ENTITY_QUERY_LIST_SORT,
  ENTITY_QUERY_MODE_FILTERS,
  ENTITY_QUERY_STATUS_FILTERS,
  entityQueryModeLabelKey,
  entityQuerySortLabelKey,
  entityQueryStatusLabelKey,
  isEntityQueryListSort,
  type EntityQueryListSort,
  type EntityQueryModeFilter,
  type EntityQueryStatusFilter,
} from "./entity-query-list-styles";

interface EntityQueriesListFilterBadge {
  readonly id: string;
  readonly label: string;
  readonly onRemove: () => void;
}

function parseCsvFilter<T extends string>(
  raw: string | null,
  allowed: readonly T[],
): T[] {
  if (!raw?.trim()) {
    return [];
  }

  const allowedSet = new Set<string>(allowed);
  return raw
    .split(",")
    .map((entry) => entry.trim())
    .filter((entry): entry is T => allowedSet.has(entry));
}

function parseEntities(raw: string | null): string[] {
  if (!raw?.trim()) {
    return [];
  }

  return raw
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function entityQuerySearchHaystack(
  definition: EntityQueryDefinitionRecord,
): string {
  return [
    definition.name,
    definition.description ?? "",
    definition.id,
    definition.queryId,
    definition.sourceEntity,
  ]
    .join(" ")
    .toLowerCase();
}

function definitionQueryMode(
  definition: EntityQueryDefinitionRecord,
): EntityQueryModeFilter {
  return definition.queryMode === "aggregated" ? "aggregated" : "records";
}

interface EntityQueriesListQueryState {
  readonly search: string;
  readonly statuses: readonly EntityQueryStatusFilter[];
  readonly queryModes: readonly EntityQueryModeFilter[];
  readonly entities: readonly string[];
  readonly sort: EntityQueryListSort;
}

export function buildEntityQueriesListQueryState(
  searchParams: URLSearchParams,
): EntityQueriesListQueryState {
  const rawSort = searchParams.get("sort") ?? DEFAULT_ENTITY_QUERY_LIST_SORT;
  return {
    search: searchParams.get("q")?.trim() ?? "",
    statuses: parseCsvFilter(
      searchParams.get("status"),
      ENTITY_QUERY_STATUS_FILTERS,
    ),
    queryModes: parseCsvFilter(
      searchParams.get("queryMode"),
      ENTITY_QUERY_MODE_FILTERS,
    ),
    entities: parseEntities(searchParams.get("entity")),
    sort: isEntityQueryListSort(rawSort)
      ? rawSort
      : DEFAULT_ENTITY_QUERY_LIST_SORT,
  };
}

export function filterEntityQueryDefinitions(
  definitions: readonly EntityQueryDefinitionRecord[],
  query: EntityQueriesListQueryState,
): EntityQueryDefinitionRecord[] {
  const searchNeedle = query.search.toLowerCase();

  return definitions.filter((definition) => {
    if (
      query.statuses.length > 0 &&
      !query.statuses.includes(definition.status)
    ) {
      return false;
    }

    if (
      query.queryModes.length > 0 &&
      !query.queryModes.includes(definitionQueryMode(definition))
    ) {
      return false;
    }

    if (
      query.entities.length > 0 &&
      !query.entities.includes(definition.sourceEntity)
    ) {
      return false;
    }

    if (searchNeedle.length === 0) {
      return true;
    }

    return entityQuerySearchHaystack(definition).includes(searchNeedle);
  });
}

export function sortEntityQueryDefinitions(
  definitions: readonly EntityQueryDefinitionRecord[],
  sort: EntityQueryListSort,
): EntityQueryDefinitionRecord[] {
  const sorted = [...definitions];

  switch (sort) {
    case "nameDesc":
      sorted.sort((left, right) => right.name.localeCompare(left.name));
      break;
    case "sourceEntity":
      sorted.sort(
        (left, right) =>
          left.sourceEntity.localeCompare(right.sourceEntity) ||
          left.name.localeCompare(right.name),
      );
      break;
    case "queryMode":
      sorted.sort(
        (left, right) =>
          definitionQueryMode(left).localeCompare(definitionQueryMode(right)) ||
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

export function useEntityQueriesListQuery(
  definitions: readonly EntityQueryDefinitionRecord[],
) {
  const [searchParams, setSearchParams] = useSearchParams();

  const query = useMemo(
    (): EntityQueriesListQueryState =>
      buildEntityQueriesListQueryState(searchParams),
    [searchParams],
  );

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
    (sort: EntityQueryListSort) => {
      updateSearchParams((next) => {
        if (sort === DEFAULT_ENTITY_QUERY_LIST_SORT) {
          next.delete("sort");
        } else {
          next.set("sort", sort);
        }
      });
    },
    [updateSearchParams],
  );

  const toggleStatus = useCallback(
    (status: EntityQueryStatusFilter) => {
      updateSearchParams((next) => {
        const current = parseCsvFilter(
          next.get("status"),
          ENTITY_QUERY_STATUS_FILTERS,
        );
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

  const toggleQueryMode = useCallback(
    (mode: EntityQueryModeFilter) => {
      updateSearchParams((next) => {
        const current = parseCsvFilter(
          next.get("queryMode"),
          ENTITY_QUERY_MODE_FILTERS,
        );
        const exists = current.includes(mode);
        const updated = exists
          ? current.filter((entry) => entry !== mode)
          : [...current, mode];

        if (updated.length === 0) {
          next.delete("queryMode");
        } else {
          next.set("queryMode", updated.join(","));
        }
      });
    },
    [updateSearchParams],
  );

  const toggleEntity = useCallback(
    (entity: string) => {
      updateSearchParams((next) => {
        const current = parseEntities(next.get("entity"));
        const exists = current.includes(entity);
        const updated = exists
          ? current.filter((entry) => entry !== entity)
          : [...current, entity];

        if (updated.length === 0) {
          next.delete("entity");
        } else {
          next.set("entity", updated.join(","));
        }
      });
    },
    [updateSearchParams],
  );

  const clearFilters = useCallback(() => {
    updateSearchParams((next) => {
      next.delete("q");
      next.delete("status");
      next.delete("queryMode");
      next.delete("entity");
      next.delete("sort");
    });
  }, [updateSearchParams]);

  const filteredDefinitions = useMemo(
    () => filterEntityQueryDefinitions(definitions, query),
    [definitions, query],
  );

  const listDefinitions = useMemo(
    () => sortEntityQueryDefinitions(filteredDefinitions, query.sort),
    [filteredDefinitions, query.sort],
  );

  const entityOptions = useMemo(() => {
    const names = new Set<string>();
    for (const definition of definitions) {
      names.add(definition.sourceEntity);
    }
    return [...names].sort((left, right) => left.localeCompare(right));
  }, [definitions]);

  const statusCounts = useMemo(() => {
    const counts: Partial<Record<EntityQueryStatusFilter, number>> = {};

    for (const definition of filteredDefinitions) {
      counts[definition.status] = (counts[definition.status] ?? 0) + 1;
    }

    return counts;
  }, [filteredDefinitions]);

  const queryModeCounts = useMemo(() => {
    const counts: Partial<Record<EntityQueryModeFilter, number>> = {};

    for (const definition of filteredDefinitions) {
      const mode = definitionQueryMode(definition);
      counts[mode] = (counts[mode] ?? 0) + 1;
    }

    return counts;
  }, [filteredDefinitions]);

  const hasActiveFilters =
    query.search.length > 0 ||
    query.statuses.length > 0 ||
    query.queryModes.length > 0 ||
    query.entities.length > 0 ||
    query.sort !== DEFAULT_ENTITY_QUERY_LIST_SORT;

  const activeFilterBadges = useMemo((): EntityQueriesListFilterBadge[] => {
    const badges: EntityQueriesListFilterBadge[] = [];

    if (query.search.length > 0) {
      badges.push({
        id: "search",
        label: query.search,
        onRemove: () => setSearch(""),
      });
    }

    for (const status of query.statuses) {
      badges.push({
        id: `status:${status}`,
        label: status,
        onRemove: () => toggleStatus(status),
      });
    }

    for (const mode of query.queryModes) {
      badges.push({
        id: `queryMode:${mode}`,
        label: mode,
        onRemove: () => toggleQueryMode(mode),
      });
    }

    for (const entity of query.entities) {
      badges.push({
        id: `entity:${entity}`,
        label: entity,
        onRemove: () => toggleEntity(entity),
      });
    }

    if (query.sort !== DEFAULT_ENTITY_QUERY_LIST_SORT) {
      badges.push({
        id: "sort",
        label: query.sort,
        onRemove: () => setSort(DEFAULT_ENTITY_QUERY_LIST_SORT),
      });
    }

    return badges;
  }, [
    query.entities,
    query.queryModes,
    query.search,
    query.sort,
    query.statuses,
    setSearch,
    setSort,
    toggleEntity,
    toggleQueryMode,
    toggleStatus,
  ]);

  return {
    query,
    listDefinitions,
    filteredDefinitions,
    entityOptions,
    statusCounts,
    queryModeCounts,
    hasActiveFilters,
    activeFilterBadges,
    setSearch,
    setSort,
    toggleStatus,
    toggleQueryMode,
    toggleEntity,
    clearFilters,
    entityQueryStatusLabelKey,
    entityQueryModeLabelKey,
    entityQuerySortLabelKey,
  };
}
