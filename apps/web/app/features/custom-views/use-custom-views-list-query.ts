import { useCallback, useMemo } from "react";
import { useSearchParams } from "react-router";

import type { CustomViewRecord } from "../../lib/api-client";
import {
  readListQuerySearch,
  writeListQuerySearch,
} from "../../lib/list-query-search-param";
import {
  CUSTOM_VIEW_STATUS_FILTERS,
  DEFAULT_CUSTOM_VIEW_LIST_SORT,
  customViewSortLabelKey,
  customViewStatusLabelKey,
  isCustomViewListSort,
  type CustomViewListSort,
  type CustomViewStatusFilter,
} from "./custom-view-list-styles";

interface CustomViewsListQuery {
  readonly search: string;
  readonly statuses: readonly CustomViewStatusFilter[];
  readonly entities: readonly string[];
  readonly sort: CustomViewListSort;
}

interface CustomViewsListFilterBadge {
  readonly id: string;
  readonly label: string;
  readonly onRemove: () => void;
}

function parseStatuses(raw: string | null): CustomViewStatusFilter[] {
  if (!raw?.trim()) {
    return [];
  }

  const allowed = new Set<string>(CUSTOM_VIEW_STATUS_FILTERS);
  return raw
    .split(",")
    .map((entry) => entry.trim())
    .filter((entry): entry is CustomViewStatusFilter => allowed.has(entry));
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

function customViewSearchHaystack(
  view: CustomViewRecord,
  queryName?: string,
): string {
  return [
    view.name,
    view.viewId,
    view.sourceEntity,
    view.nav.label,
    view.description ?? "",
    queryName ?? "",
  ]
    .join(" ")
    .toLowerCase();
}

function sortCustomViews(
  views: readonly CustomViewRecord[],
  sort: CustomViewListSort,
): CustomViewRecord[] {
  const sorted = [...views];

  switch (sort) {
    case "nameDesc":
      sorted.sort((left, right) => right.name.localeCompare(left.name));
      break;
    case "entity":
      sorted.sort(
        (left, right) =>
          left.sourceEntity.localeCompare(right.sourceEntity) ||
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

export function useCustomViewsListQuery(
  views: readonly CustomViewRecord[],
  queryNameById: Readonly<Record<string, string>>,
) {
  const [searchParams, setSearchParams] = useSearchParams();

  const query = useMemo((): CustomViewsListQuery => {
    const rawSort = searchParams.get("sort") ?? DEFAULT_CUSTOM_VIEW_LIST_SORT;
    return {
      search: readListQuerySearch(searchParams),
      statuses: parseStatuses(searchParams.get("status")),
      entities: parseEntities(searchParams.get("entity")),
      sort: isCustomViewListSort(rawSort)
        ? rawSort
        : DEFAULT_CUSTOM_VIEW_LIST_SORT,
    };
  }, [searchParams]);

  const availableEntities = useMemo(() => {
    const entities = new Set<string>();
    for (const view of views) {
      entities.add(view.sourceEntity);
    }
    return [...entities].sort((left, right) => left.localeCompare(right));
  }, [views]);

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
        writeListQuerySearch(next, search);
      });
    },
    [updateSearchParams],
  );

  const setSort = useCallback(
    (sort: CustomViewListSort) => {
      updateSearchParams((next) => {
        if (sort === DEFAULT_CUSTOM_VIEW_LIST_SORT) {
          next.delete("sort");
        } else {
          next.set("sort", sort);
        }
      });
    },
    [updateSearchParams],
  );

  const toggleStatus = useCallback(
    (status: CustomViewStatusFilter) => {
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
      next.delete("entity");
      next.delete("sort");
    });
  }, [updateSearchParams]);

  const filteredViews = useMemo(() => {
    const searchNeedle = query.search.trim().toLowerCase();

    return views.filter((view) => {
      if (query.statuses.length > 0 && !query.statuses.includes(view.status)) {
        return false;
      }

      if (
        query.entities.length > 0 &&
        !query.entities.includes(view.sourceEntity)
      ) {
        return false;
      }

      if (searchNeedle.length === 0) {
        return true;
      }

      return customViewSearchHaystack(
        view,
        queryNameById[view.entityQueryDefinitionId],
      ).includes(searchNeedle);
    });
  }, [query.entities, query.search, query.statuses, queryNameById, views]);

  const listViews = useMemo(
    () => sortCustomViews(filteredViews, query.sort),
    [filteredViews, query.sort],
  );

  const statusCounts = useMemo(() => {
    const counts: Partial<Record<CustomViewStatusFilter, number>> = {};

    for (const view of filteredViews) {
      counts[view.status] = (counts[view.status] ?? 0) + 1;
    }

    return counts;
  }, [filteredViews]);

  const entityCounts = useMemo(() => {
    const counts: Record<string, number> = {};

    for (const view of filteredViews) {
      counts[view.sourceEntity] = (counts[view.sourceEntity] ?? 0) + 1;
    }

    return counts;
  }, [filteredViews]);

  const hasActiveFilters =
    query.search.trim().length > 0 ||
    query.statuses.length > 0 ||
    query.entities.length > 0 ||
    query.sort !== DEFAULT_CUSTOM_VIEW_LIST_SORT;

  const activeFilterBadges = useMemo((): CustomViewsListFilterBadge[] => {
    const badges: CustomViewsListFilterBadge[] = [];

    if (query.search.trim().length > 0) {
      badges.push({
        id: "search",
        label: query.search.trim(),
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

    for (const entity of query.entities) {
      badges.push({
        id: `entity:${entity}`,
        label: entity,
        onRemove: () => toggleEntity(entity),
      });
    }

    if (query.sort !== DEFAULT_CUSTOM_VIEW_LIST_SORT) {
      badges.push({
        id: "sort",
        label: query.sort,
        onRemove: () => setSort(DEFAULT_CUSTOM_VIEW_LIST_SORT),
      });
    }

    return badges;
  }, [
    query.entities,
    query.search,
    query.sort,
    query.statuses,
    setSearch,
    setSort,
    toggleEntity,
    toggleStatus,
  ]);

  return {
    query,
    listViews,
    filteredViews,
    availableEntities,
    statusCounts,
    entityCounts,
    hasActiveFilters,
    activeFilterBadges,
    setSearch,
    setSort,
    toggleStatus,
    toggleEntity,
    clearFilters,
    customViewStatusLabelKey,
    customViewSortLabelKey,
  };
}
