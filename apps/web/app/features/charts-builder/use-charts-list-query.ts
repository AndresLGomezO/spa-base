import { useCallback, useMemo } from "react";
import { useSearchParams } from "react-router";

import type { ChartDefinitionRecord } from "../../lib/api-client.js";
import {
  CHART_DATA_SOURCE_FILTERS,
  CHART_DISPLAY_MODE_FILTERS,
  CHART_STATUS_FILTERS,
  CHART_TYPE_FILTERS,
  DEFAULT_CHART_LIST_SORT,
  chartDataSourceLabelKey,
  chartDisplayModeLabelKey,
  chartSortLabelKey,
  chartStatusLabelKey,
  chartTypeLabelKey,
  isChartListSort,
  type ChartDataSourceFilter,
  type ChartDisplayModeFilter,
  type ChartListSort,
  type ChartStatusFilter,
  type ChartTypeFilter,
} from "./chart-list-styles.js";

interface ChartsListFilterBadge {
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

function chartSearchHaystack(definition: ChartDefinitionRecord): string {
  return [
    definition.name,
    definition.description ?? "",
    definition.id,
    definition.chartId,
  ]
    .join(" ")
    .toLowerCase();
}

interface ChartsListQueryState {
  readonly search: string;
  readonly dataSources: readonly ChartDataSourceFilter[];
  readonly chartTypes: readonly ChartTypeFilter[];
  readonly displayModes: readonly ChartDisplayModeFilter[];
  readonly statuses: readonly ChartStatusFilter[];
  readonly sort: ChartListSort;
}

export function buildChartsListQueryState(
  searchParams: URLSearchParams,
): ChartsListQueryState {
  const rawSort = searchParams.get("sort") ?? DEFAULT_CHART_LIST_SORT;
  return {
    search: searchParams.get("q")?.trim() ?? "",
    dataSources: parseCsvFilter(
      searchParams.get("dataSource"),
      CHART_DATA_SOURCE_FILTERS,
    ),
    chartTypes: parseCsvFilter(
      searchParams.get("chartType"),
      CHART_TYPE_FILTERS,
    ),
    displayModes: parseCsvFilter(
      searchParams.get("displayMode"),
      CHART_DISPLAY_MODE_FILTERS,
    ),
    statuses: parseCsvFilter(searchParams.get("status"), CHART_STATUS_FILTERS),
    sort: isChartListSort(rawSort) ? rawSort : DEFAULT_CHART_LIST_SORT,
  };
}

export function filterChartDefinitions(
  definitions: readonly ChartDefinitionRecord[],
  query: ChartsListQueryState,
): ChartDefinitionRecord[] {
  const searchNeedle = query.search.toLowerCase();

  return definitions.filter((definition) => {
    if (
      query.dataSources.length > 0 &&
      !query.dataSources.includes(definition.dataSource.type)
    ) {
      return false;
    }

    if (
      query.chartTypes.length > 0 &&
      !query.chartTypes.includes(definition.chartType)
    ) {
      return false;
    }

    const displayMode = definition.displayMode ?? "inline";
    if (
      query.displayModes.length > 0 &&
      !query.displayModes.includes(displayMode)
    ) {
      return false;
    }

    if (
      query.statuses.length > 0 &&
      !query.statuses.includes(definition.status)
    ) {
      return false;
    }

    if (searchNeedle.length === 0) {
      return true;
    }

    return chartSearchHaystack(definition).includes(searchNeedle);
  });
}

export function sortChartDefinitions(
  definitions: readonly ChartDefinitionRecord[],
  sort: ChartListSort,
): ChartDefinitionRecord[] {
  const sorted = [...definitions];

  switch (sort) {
    case "nameDesc":
      sorted.sort((left, right) => right.name.localeCompare(left.name));
      break;
    case "dataSource":
      sorted.sort(
        (left, right) =>
          left.dataSource.type.localeCompare(right.dataSource.type) ||
          left.name.localeCompare(right.name),
      );
      break;
    case "chartType":
      sorted.sort(
        (left, right) =>
          left.chartType.localeCompare(right.chartType) ||
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

export function useChartsListQuery(
  definitions: readonly ChartDefinitionRecord[],
) {
  const [searchParams, setSearchParams] = useSearchParams();

  const query = useMemo(
    (): ChartsListQueryState => buildChartsListQueryState(searchParams),
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
    (sort: ChartListSort) => {
      updateSearchParams((next) => {
        if (sort === DEFAULT_CHART_LIST_SORT) {
          next.delete("sort");
        } else {
          next.set("sort", sort);
        }
      });
    },
    [updateSearchParams],
  );

  const toggleDataSource = useCallback(
    (dataSource: ChartDataSourceFilter) => {
      updateSearchParams((next) => {
        const current = parseCsvFilter(
          next.get("dataSource"),
          CHART_DATA_SOURCE_FILTERS,
        );
        const exists = current.includes(dataSource);
        const updated = exists
          ? current.filter((entry) => entry !== dataSource)
          : [...current, dataSource];

        if (updated.length === 0) {
          next.delete("dataSource");
        } else {
          next.set("dataSource", updated.join(","));
        }
      });
    },
    [updateSearchParams],
  );

  const toggleChartType = useCallback(
    (chartType: ChartTypeFilter) => {
      updateSearchParams((next) => {
        const current = parseCsvFilter(
          next.get("chartType"),
          CHART_TYPE_FILTERS,
        );
        const exists = current.includes(chartType);
        const updated = exists
          ? current.filter((entry) => entry !== chartType)
          : [...current, chartType];

        if (updated.length === 0) {
          next.delete("chartType");
        } else {
          next.set("chartType", updated.join(","));
        }
      });
    },
    [updateSearchParams],
  );

  const toggleDisplayMode = useCallback(
    (displayMode: ChartDisplayModeFilter) => {
      updateSearchParams((next) => {
        const current = parseCsvFilter(
          next.get("displayMode"),
          CHART_DISPLAY_MODE_FILTERS,
        );
        const exists = current.includes(displayMode);
        const updated = exists
          ? current.filter((entry) => entry !== displayMode)
          : [...current, displayMode];

        if (updated.length === 0) {
          next.delete("displayMode");
        } else {
          next.set("displayMode", updated.join(","));
        }
      });
    },
    [updateSearchParams],
  );

  const toggleStatus = useCallback(
    (status: ChartStatusFilter) => {
      updateSearchParams((next) => {
        const current = parseCsvFilter(
          next.get("status"),
          CHART_STATUS_FILTERS,
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

  const clearFilters = useCallback(() => {
    updateSearchParams((next) => {
      next.delete("q");
      next.delete("dataSource");
      next.delete("chartType");
      next.delete("displayMode");
      next.delete("status");
      next.delete("sort");
    });
  }, [updateSearchParams]);

  const filteredDefinitions = useMemo(
    () => filterChartDefinitions(definitions, query),
    [definitions, query],
  );

  const listDefinitions = useMemo(
    () => sortChartDefinitions(filteredDefinitions, query.sort),
    [filteredDefinitions, query.sort],
  );

  const hasActiveFilters =
    query.search.length > 0 ||
    query.dataSources.length > 0 ||
    query.chartTypes.length > 0 ||
    query.displayModes.length > 0 ||
    query.statuses.length > 0 ||
    query.sort !== DEFAULT_CHART_LIST_SORT;

  const activeFilterBadges = useMemo((): ChartsListFilterBadge[] => {
    const badges: ChartsListFilterBadge[] = [];

    if (query.search.length > 0) {
      badges.push({
        id: "search",
        label: query.search,
        onRemove: () => setSearch(""),
      });
    }

    for (const dataSource of query.dataSources) {
      badges.push({
        id: `dataSource:${dataSource}`,
        label: dataSource,
        onRemove: () => toggleDataSource(dataSource),
      });
    }

    for (const chartType of query.chartTypes) {
      badges.push({
        id: `chartType:${chartType}`,
        label: chartType,
        onRemove: () => toggleChartType(chartType),
      });
    }

    for (const displayMode of query.displayModes) {
      badges.push({
        id: `displayMode:${displayMode}`,
        label: displayMode,
        onRemove: () => toggleDisplayMode(displayMode),
      });
    }

    for (const status of query.statuses) {
      badges.push({
        id: `status:${status}`,
        label: status,
        onRemove: () => toggleStatus(status),
      });
    }

    if (query.sort !== DEFAULT_CHART_LIST_SORT) {
      badges.push({
        id: "sort",
        label: query.sort,
        onRemove: () => setSort(DEFAULT_CHART_LIST_SORT),
      });
    }

    return badges;
  }, [
    query.chartTypes,
    query.dataSources,
    query.displayModes,
    query.search,
    query.sort,
    query.statuses,
    setSearch,
    setSort,
    toggleChartType,
    toggleDataSource,
    toggleDisplayMode,
    toggleStatus,
  ]);

  return {
    query,
    listDefinitions,
    filteredDefinitions,
    hasActiveFilters,
    activeFilterBadges,
    setSearch,
    setSort,
    toggleDataSource,
    toggleChartType,
    toggleDisplayMode,
    toggleStatus,
    clearFilters,
    chartDataSourceLabelKey,
    chartTypeLabelKey,
    chartDisplayModeLabelKey,
    chartStatusLabelKey,
    chartSortLabelKey,
  };
}
