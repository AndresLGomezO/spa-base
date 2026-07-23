import { useCallback, useMemo, useState } from "react";

import type { DebugEvent } from "../../lib/api-client";
import {
  DEFAULT_DEBUGGER_LIST_SORT,
  debuggerEventSearchHaystack,
  debuggerStatusSortPriority,
  type DebuggerListSort,
} from "./debugger-status-styles";
import { debuggerStatusLabelKey } from "./components/DebuggerStatusBadge";
import { totalHookExecutionWritesFromEvent } from "./hook-execution-presentation";
import {
  eventMatchesHookExecutionStatusFilter,
  eventMatchesHookExecutionType,
  HOOK_EXECUTION_STATUS_FILTERS,
  HOOK_EXECUTION_TYPE_KEYS,
  hookExecutionTypeLabelKey,
  isHookExecutionSkippedEvent,
  type HookExecutionStatusFilter,
  type HookExecutionTypeKey,
} from "./hook-execution-live-metrics";

interface LocalHookExecutionListQuery {
  readonly search: string;
  readonly statuses: readonly HookExecutionStatusFilter[];
  readonly executionTypes: readonly HookExecutionTypeKey[];
  readonly minWrites: number;
  readonly minDurationMs: number;
  readonly sort: DebuggerListSort;
  readonly showSkipped: boolean;
}

interface LocalHookExecutionFilterBadge {
  readonly id: string;
  readonly label: string;
  readonly onRemove: () => void;
}

function sortHookExecutionEvents(
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

const DEFAULT_QUERY: LocalHookExecutionListQuery = {
  search: "",
  statuses: [],
  executionTypes: [],
  minWrites: 0,
  minDurationMs: 0,
  sort: DEFAULT_DEBUGGER_LIST_SORT,
  showSkipped: false,
};

export function useLocalHookExecutionListQuery(
  sourceEvents: readonly DebugEvent[],
  timeBounds?: { readonly sinceIso: string; readonly untilIso: string } | null,
) {
  const [query, setQuery] =
    useState<LocalHookExecutionListQuery>(DEFAULT_QUERY);

  const setSearch = useCallback((search: string) => {
    setQuery((current) => ({ ...current, search }));
  }, []);

  const setSort = useCallback((sort: DebuggerListSort) => {
    setQuery((current) => ({ ...current, sort }));
  }, []);

  const toggleStatus = useCallback((status: HookExecutionStatusFilter) => {
    setQuery((current) => {
      const exists = current.statuses.includes(status);
      return {
        ...current,
        statuses: exists
          ? current.statuses.filter((entry) => entry !== status)
          : [...current.statuses, status],
      };
    });
  }, []);

  const setShowSkipped = useCallback((showSkipped: boolean) => {
    setQuery((current) => ({ ...current, showSkipped }));
  }, []);

  const toggleShowSkipped = useCallback(() => {
    setQuery((current) => ({
      ...current,
      showSkipped: !current.showSkipped,
    }));
  }, []);

  const toggleExecutionType = useCallback(
    (executionType: HookExecutionTypeKey) => {
      setQuery((current) => {
        const exists = current.executionTypes.includes(executionType);
        return {
          ...current,
          executionTypes: exists
            ? current.executionTypes.filter((entry) => entry !== executionType)
            : [...current.executionTypes, executionType],
        };
      });
    },
    [],
  );

  const setMinWrites = useCallback((minWrites: number) => {
    setQuery((current) => ({
      ...current,
      minWrites: Math.max(0, minWrites),
    }));
  }, []);

  const setMinDurationMs = useCallback((minDurationMs: number) => {
    setQuery((current) => ({
      ...current,
      minDurationMs: Math.max(0, minDurationMs),
    }));
  }, []);

  const clearFilters = useCallback(() => {
    setQuery(DEFAULT_QUERY);
  }, []);

  const filteredEvents = useMemo(() => {
    const searchNeedle = query.search.trim().toLowerCase();
    const sinceMs = timeBounds ? Date.parse(timeBounds.sinceIso) : Number.NaN;
    const untilMs = timeBounds ? Date.parse(timeBounds.untilIso) : Number.NaN;

    return sourceEvents.filter((event) => {
      if (Number.isFinite(sinceMs) || Number.isFinite(untilMs)) {
        const eventMs = Date.parse(event.timestamp);
        if (!Number.isFinite(eventMs)) {
          return false;
        }
        if (Number.isFinite(sinceMs) && eventMs < sinceMs) {
          return false;
        }
        if (Number.isFinite(untilMs) && eventMs > untilMs) {
          return false;
        }
      }

      if (!query.showSkipped && isHookExecutionSkippedEvent(event)) {
        return false;
      }

      if (
        query.statuses.length > 0 &&
        !query.statuses.some((status) =>
          eventMatchesHookExecutionStatusFilter(event, status),
        )
      ) {
        return false;
      }

      if (
        query.executionTypes.length > 0 &&
        !query.executionTypes.some((executionType) =>
          eventMatchesHookExecutionType(event, executionType),
        )
      ) {
        return false;
      }

      if (
        query.minWrites > 0 &&
        totalHookExecutionWritesFromEvent(event) < query.minWrites
      ) {
        return false;
      }

      if (
        query.minDurationMs > 0 &&
        Number(event.summary?.durationMs ?? 0) < query.minDurationMs
      ) {
        return false;
      }

      if (searchNeedle.length === 0) {
        return true;
      }

      return debuggerEventSearchHaystack(event).includes(searchNeedle);
    });
  }, [
    query.executionTypes,
    query.minDurationMs,
    query.minWrites,
    query.search,
    query.showSkipped,
    query.statuses,
    sourceEvents,
    timeBounds,
  ]);

  const listEvents = useMemo(
    () => sortHookExecutionEvents(filteredEvents, query.sort),
    [filteredEvents, query.sort],
  );

  const statusCounts = useMemo(() => {
    const counts: Partial<
      Record<HookExecutionStatusFilter | "skipped", number>
    > = {};

    for (const event of filteredEvents) {
      if (event.status === "pending") {
        counts.queued = (counts.queued ?? 0) + 1;
        continue;
      }
      if (!event.status) {
        continue;
      }
      if (
        event.status === "running" ||
        event.status === "success" ||
        event.status === "error" ||
        event.status === "skipped"
      ) {
        counts[event.status] = (counts[event.status] ?? 0) + 1;
      }
    }

    return counts;
  }, [filteredEvents]);

  const hasActiveFilters =
    query.search.trim().length > 0 ||
    query.statuses.length > 0 ||
    query.executionTypes.length > 0 ||
    query.minWrites > 0 ||
    query.minDurationMs > 0 ||
    query.showSkipped ||
    query.sort !== DEFAULT_DEBUGGER_LIST_SORT;

  const activeFilterBadges = useMemo((): LocalHookExecutionFilterBadge[] => {
    const badges: LocalHookExecutionFilterBadge[] = [];

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

    if (query.showSkipped) {
      badges.push({
        id: "showSkipped",
        label: "showSkipped",
        onRemove: () => setShowSkipped(false),
      });
    }

    for (const executionType of query.executionTypes) {
      badges.push({
        id: `executionType:${executionType}`,
        label: executionType,
        onRemove: () => toggleExecutionType(executionType),
      });
    }

    if (query.minWrites > 0) {
      badges.push({
        id: "minWrites",
        label: String(query.minWrites),
        onRemove: () => setMinWrites(0),
      });
    }

    if (query.minDurationMs > 0) {
      badges.push({
        id: "minDuration",
        label: String(query.minDurationMs),
        onRemove: () => setMinDurationMs(0),
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
    query.executionTypes,
    query.minDurationMs,
    query.minWrites,
    query.search,
    query.showSkipped,
    query.sort,
    query.statuses,
    setMinDurationMs,
    setMinWrites,
    setSearch,
    setShowSkipped,
    setSort,
    toggleExecutionType,
    toggleStatus,
  ]);

  return {
    query,
    listEvents,
    statusCounts,
    availableStatuses: HOOK_EXECUTION_STATUS_FILTERS,
    availableExecutionTypes: HOOK_EXECUTION_TYPE_KEYS,
    hasActiveFilters,
    activeFilterBadges,
    setSearch,
    setSort,
    toggleStatus,
    toggleShowSkipped,
    setShowSkipped,
    toggleExecutionType,
    setMinWrites,
    setMinDurationMs,
    clearFilters,
    debuggerStatusLabelKey,
    hookExecutionTypeLabelKey,
  };
}
