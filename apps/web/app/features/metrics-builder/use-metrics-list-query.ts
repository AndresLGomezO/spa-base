import { useCallback, useMemo } from "react";
import { useSearchParams } from "react-router";

import type { MetricDefinitionRecord } from "../../lib/api-client";
import {
  DEFAULT_METRIC_LIST_SORT,
  METRIC_MODE_FILTERS,
  METRIC_SOURCE_TYPE_FILTERS,
  METRIC_STATUS_FILTERS,
  metricModeLabelKey,
  metricSortLabelKey,
  metricSourceTypeLabelKey,
  metricStatusLabelKey,
  isMetricListSort,
  type MetricListSort,
  type MetricModeFilter,
  type MetricSourceTypeFilter,
  type MetricStatusFilter,
} from "./metric-list-styles";

interface MetricsListFilterBadge {
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

function metricSearchHaystack(definition: MetricDefinitionRecord): string {
  return [
    definition.name,
    definition.description ?? "",
    definition.id,
    definition.sourceModel,
    definition.metricId,
  ]
    .join(" ")
    .toLowerCase();
}

function definitionSourceType(
  definition: MetricDefinitionRecord,
): MetricSourceTypeFilter {
  return definition.sourceQueryDefinitionId ? "query" : "entity";
}

function definitionMode(definition: MetricDefinitionRecord): MetricModeFilter {
  return definition.computationMode === "computed" ? "computed" : "aggregated";
}

interface MetricsListQueryState {
  readonly search: string;
  readonly sourceTypes: readonly MetricSourceTypeFilter[];
  readonly modes: readonly MetricModeFilter[];
  readonly statuses: readonly MetricStatusFilter[];
  readonly entities: readonly string[];
  readonly sort: MetricListSort;
}

export function buildMetricsListQueryState(
  searchParams: URLSearchParams,
): MetricsListQueryState {
  const rawSort = searchParams.get("sort") ?? DEFAULT_METRIC_LIST_SORT;
  return {
    search: searchParams.get("q")?.trim() ?? "",
    sourceTypes: parseCsvFilter(
      searchParams.get("sourceType"),
      METRIC_SOURCE_TYPE_FILTERS,
    ),
    modes: parseCsvFilter(searchParams.get("mode"), METRIC_MODE_FILTERS),
    statuses: parseCsvFilter(searchParams.get("status"), METRIC_STATUS_FILTERS),
    entities: parseEntities(searchParams.get("entity")),
    sort: isMetricListSort(rawSort) ? rawSort : DEFAULT_METRIC_LIST_SORT,
  };
}

export function filterMetricDefinitions(
  definitions: readonly MetricDefinitionRecord[],
  query: MetricsListQueryState,
): MetricDefinitionRecord[] {
  const searchNeedle = query.search.toLowerCase();

  return definitions.filter((definition) => {
    if (
      query.sourceTypes.length > 0 &&
      !query.sourceTypes.includes(definitionSourceType(definition))
    ) {
      return false;
    }

    if (
      query.modes.length > 0 &&
      !query.modes.includes(definitionMode(definition))
    ) {
      return false;
    }

    if (
      query.statuses.length > 0 &&
      !query.statuses.includes(definition.status)
    ) {
      return false;
    }

    if (
      query.entities.length > 0 &&
      !query.entities.includes(definition.sourceModel)
    ) {
      return false;
    }

    if (searchNeedle.length === 0) {
      return true;
    }

    return metricSearchHaystack(definition).includes(searchNeedle);
  });
}

export function sortMetricDefinitions(
  definitions: readonly MetricDefinitionRecord[],
  sort: MetricListSort,
): MetricDefinitionRecord[] {
  const sorted = [...definitions];

  switch (sort) {
    case "nameDesc":
      sorted.sort((left, right) => right.name.localeCompare(left.name));
      break;
    case "sourceModel":
      sorted.sort(
        (left, right) =>
          left.sourceModel.localeCompare(right.sourceModel) ||
          left.name.localeCompare(right.name),
      );
      break;
    case "mode":
      sorted.sort(
        (left, right) =>
          definitionMode(left).localeCompare(definitionMode(right)) ||
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

export function useMetricsListQuery(
  definitions: readonly MetricDefinitionRecord[],
) {
  const [searchParams, setSearchParams] = useSearchParams();

  const query = useMemo(
    (): MetricsListQueryState => buildMetricsListQueryState(searchParams),
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
    (sort: MetricListSort) => {
      updateSearchParams((next) => {
        if (sort === DEFAULT_METRIC_LIST_SORT) {
          next.delete("sort");
        } else {
          next.set("sort", sort);
        }
      });
    },
    [updateSearchParams],
  );

  const toggleSourceType = useCallback(
    (sourceType: MetricSourceTypeFilter) => {
      updateSearchParams((next) => {
        const current = parseCsvFilter(
          next.get("sourceType"),
          METRIC_SOURCE_TYPE_FILTERS,
        );
        const exists = current.includes(sourceType);
        const updated = exists
          ? current.filter((entry) => entry !== sourceType)
          : [...current, sourceType];

        if (updated.length === 0) {
          next.delete("sourceType");
        } else {
          next.set("sourceType", updated.join(","));
        }
      });
    },
    [updateSearchParams],
  );

  const toggleMode = useCallback(
    (mode: MetricModeFilter) => {
      updateSearchParams((next) => {
        const current = parseCsvFilter(next.get("mode"), METRIC_MODE_FILTERS);
        const exists = current.includes(mode);
        const updated = exists
          ? current.filter((entry) => entry !== mode)
          : [...current, mode];

        if (updated.length === 0) {
          next.delete("mode");
        } else {
          next.set("mode", updated.join(","));
        }
      });
    },
    [updateSearchParams],
  );

  const toggleStatus = useCallback(
    (status: MetricStatusFilter) => {
      updateSearchParams((next) => {
        const current = parseCsvFilter(
          next.get("status"),
          METRIC_STATUS_FILTERS,
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
      next.delete("sourceType");
      next.delete("mode");
      next.delete("status");
      next.delete("entity");
      next.delete("sort");
    });
  }, [updateSearchParams]);

  const filteredDefinitions = useMemo(
    () => filterMetricDefinitions(definitions, query),
    [definitions, query],
  );

  const listDefinitions = useMemo(
    () => sortMetricDefinitions(filteredDefinitions, query.sort),
    [filteredDefinitions, query.sort],
  );

  const entityOptions = useMemo(() => {
    const models = new Set<string>();
    for (const definition of definitions) {
      if (definition.sourceModel.trim()) {
        models.add(definition.sourceModel);
      }
    }
    return [...models].sort((left, right) => left.localeCompare(right));
  }, [definitions]);

  const sourceTypeCounts = useMemo(() => {
    const counts: Partial<Record<MetricSourceTypeFilter, number>> = {};
    for (const definition of filteredDefinitions) {
      const sourceType = definitionSourceType(definition);
      counts[sourceType] = (counts[sourceType] ?? 0) + 1;
    }
    return counts;
  }, [filteredDefinitions]);

  const modeCounts = useMemo(() => {
    const counts: Partial<Record<MetricModeFilter, number>> = {};
    for (const definition of filteredDefinitions) {
      const mode = definitionMode(definition);
      counts[mode] = (counts[mode] ?? 0) + 1;
    }
    return counts;
  }, [filteredDefinitions]);

  const statusCounts = useMemo(() => {
    const counts: Partial<Record<MetricStatusFilter, number>> = {};
    for (const definition of filteredDefinitions) {
      counts[definition.status] = (counts[definition.status] ?? 0) + 1;
    }
    return counts;
  }, [filteredDefinitions]);

  const entityCounts = useMemo(() => {
    const counts: Partial<Record<string, number>> = {};
    for (const definition of filteredDefinitions) {
      counts[definition.sourceModel] =
        (counts[definition.sourceModel] ?? 0) + 1;
    }
    return counts;
  }, [filteredDefinitions]);

  const hasActiveFilters =
    query.search.length > 0 ||
    query.sourceTypes.length > 0 ||
    query.modes.length > 0 ||
    query.statuses.length > 0 ||
    query.entities.length > 0 ||
    query.sort !== DEFAULT_METRIC_LIST_SORT;

  const activeFilterBadges = useMemo((): MetricsListFilterBadge[] => {
    const badges: MetricsListFilterBadge[] = [];

    if (query.search.length > 0) {
      badges.push({
        id: "search",
        label: query.search,
        onRemove: () => setSearch(""),
      });
    }

    for (const sourceType of query.sourceTypes) {
      badges.push({
        id: `sourceType:${sourceType}`,
        label: sourceType,
        onRemove: () => toggleSourceType(sourceType),
      });
    }

    for (const mode of query.modes) {
      badges.push({
        id: `mode:${mode}`,
        label: mode,
        onRemove: () => toggleMode(mode),
      });
    }

    for (const status of query.statuses) {
      badges.push({
        id: `status:${status}`,
        label: status,
        onRemove: () => toggleStatus(status),
      });
    }

    for (const entity of query.entities) {
      badges.push({
        id: `entity:${entity}`,
        label: entity,
        onRemove: () => toggleEntity(entity),
      });
    }

    if (query.sort !== DEFAULT_METRIC_LIST_SORT) {
      badges.push({
        id: "sort",
        label: query.sort,
        onRemove: () => setSort(DEFAULT_METRIC_LIST_SORT),
      });
    }

    return badges;
  }, [
    query.entities,
    query.modes,
    query.search,
    query.sort,
    query.sourceTypes,
    query.statuses,
    setSearch,
    setSort,
    toggleEntity,
    toggleMode,
    toggleSourceType,
    toggleStatus,
  ]);

  return {
    query,
    listDefinitions,
    filteredDefinitions,
    entityOptions,
    sourceTypeCounts,
    modeCounts,
    statusCounts,
    entityCounts,
    hasActiveFilters,
    activeFilterBadges,
    setSearch,
    setSort,
    toggleSourceType,
    toggleMode,
    toggleStatus,
    toggleEntity,
    clearFilters,
    metricSourceTypeLabelKey,
    metricModeLabelKey,
    metricStatusLabelKey,
    metricSortLabelKey,
  };
}
