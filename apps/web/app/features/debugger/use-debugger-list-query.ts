import { useCallback, useMemo } from "react";
import { useSearchParams } from "react-router";

import type {
  DebugEvent,
  DebugEventSource,
  DebugEventStatus,
} from "../../lib/api-client";
import {
  DEBUGGER_STATUSES_BY_SOURCE,
  DEFAULT_DEBUGGER_LIST_SORT,
  debuggerEventSearchHaystack,
  debuggerStatusSortPriority,
  isDebuggerListSort,
  type DebuggerListSort,
} from "./debugger-status-styles";
import { debuggerStatusLabelKey } from "./components/DebuggerStatusBadge";

interface DebuggerListQuery {
  readonly search: string;
  readonly statuses: readonly DebugEventStatus[];
  readonly sort: DebuggerListSort;
}

interface DebuggerListFilterBadge {
  readonly id: string;
  readonly label: string;
  readonly onRemove: () => void;
}

function parseStatuses(
  raw: string | null,
  source: DebugEventSource,
): DebugEventStatus[] {
  if (!raw?.trim()) {
    return [];
  }

  const allowed = new Set(DEBUGGER_STATUSES_BY_SOURCE[source]);
  return raw
    .split(",")
    .map((entry) => entry.trim())
    .filter((entry): entry is DebugEventStatus =>
      allowed.has(entry as DebugEventStatus),
    );
}

function sortDebuggerEvents(
  events: readonly DebugEvent[],
  sort: DebuggerListSort,
): DebugEvent[] {
  const sorted = [...events];

  switch (sort) {
    case "oldest":
      sorted.sort((left, right) =>
        left.timestamp.localeCompare(right.timestamp),
      );
      break;
    case "title":
      sorted.sort((left, right) =>
        left.title.localeCompare(right.title, undefined, {
          sensitivity: "base",
        }),
      );
      break;
    case "status":
      sorted.sort((left, right) => {
        const priorityDelta =
          debuggerStatusSortPriority(left.status) -
          debuggerStatusSortPriority(right.status);
        if (priorityDelta !== 0) {
          return priorityDelta;
        }
        return right.timestamp.localeCompare(left.timestamp);
      });
      break;
    case "newest":
    default:
      sorted.sort((left, right) =>
        right.timestamp.localeCompare(left.timestamp),
      );
      break;
  }

  return sorted;
}

export function useDebuggerListQuery(
  sourceEvents: readonly DebugEvent[],
  activeSource: DebugEventSource,
) {
  const [searchParams, setSearchParams] = useSearchParams();

  const query = useMemo((): DebuggerListQuery => {
    const rawSort = searchParams.get("sort") ?? DEFAULT_DEBUGGER_LIST_SORT;
    return {
      search: searchParams.get("q")?.trim() ?? "",
      statuses: parseStatuses(searchParams.get("status"), activeSource),
      sort: isDebuggerListSort(rawSort) ? rawSort : DEFAULT_DEBUGGER_LIST_SORT,
    };
  }, [activeSource, searchParams]);

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
    (sort: DebuggerListSort) => {
      updateSearchParams((next) => {
        if (sort === DEFAULT_DEBUGGER_LIST_SORT) {
          next.delete("sort");
        } else {
          next.set("sort", sort);
        }
      });
    },
    [updateSearchParams],
  );

  const toggleStatus = useCallback(
    (status: DebugEventStatus) => {
      updateSearchParams((next) => {
        const current = parseStatuses(next.get("status"), activeSource);
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
    [activeSource, updateSearchParams],
  );

  const clearFilters = useCallback(() => {
    updateSearchParams((next) => {
      next.delete("q");
      next.delete("status");
      next.delete("sort");
    });
  }, [updateSearchParams]);

  const filteredEvents = useMemo(() => {
    const searchNeedle = query.search.toLowerCase();

    return sourceEvents.filter((event) => {
      if (
        query.statuses.length > 0 &&
        (!event.status || !query.statuses.includes(event.status))
      ) {
        return false;
      }

      if (searchNeedle.length === 0) {
        return true;
      }

      return debuggerEventSearchHaystack(event).includes(searchNeedle);
    });
  }, [query.search, query.statuses, sourceEvents]);

  const listEvents = useMemo(
    () => sortDebuggerEvents(filteredEvents, query.sort),
    [filteredEvents, query.sort],
  );

  const statusCounts = useMemo(() => {
    const counts: Partial<Record<DebugEventStatus, number>> = {};

    for (const event of filteredEvents) {
      if (!event.status) {
        continue;
      }
      counts[event.status] = (counts[event.status] ?? 0) + 1;
    }

    return counts;
  }, [filteredEvents]);

  const hasActiveFilters =
    query.search.length > 0 ||
    query.statuses.length > 0 ||
    query.sort !== DEFAULT_DEBUGGER_LIST_SORT;

  const activeFilterBadges = useMemo((): DebuggerListFilterBadge[] => {
    const badges: DebuggerListFilterBadge[] = [];

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

    if (query.sort !== DEFAULT_DEBUGGER_LIST_SORT) {
      badges.push({
        id: "sort",
        label: query.sort,
        onRemove: () => setSort(DEFAULT_DEBUGGER_LIST_SORT),
      });
    }

    return badges;
  }, [
    query.search,
    query.sort,
    query.statuses,
    setSearch,
    setSort,
    toggleStatus,
  ]);

  const availableStatuses = DEBUGGER_STATUSES_BY_SOURCE[activeSource];

  return {
    query,
    listEvents,
    filteredEvents,
    statusCounts,
    availableStatuses,
    hasActiveFilters,
    activeFilterBadges,
    setSearch,
    setSort,
    toggleStatus,
    clearFilters,
    debuggerStatusLabelKey,
  };
}
