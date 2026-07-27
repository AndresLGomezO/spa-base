import { useCallback, useMemo } from "react";
import { useSearchParams } from "react-router";

import type {
  DebugEvent,
  DebugEventSource,
  DebugEventStatus,
} from "../../lib/api-client";
import {
  readListQuerySearch,
  writeListQuerySearch,
} from "../../lib/list-query-search-param";
import {
  DEBUGGER_STATUSES_BY_SOURCE,
  DEFAULT_DEBUGGER_LIST_SORT,
  debuggerEventSearchHaystack,
  debuggerStatusSortPriority,
  isDebuggerListSort,
  type DebuggerListSort,
} from "./debugger-status-styles";
import { debuggerStatusLabelKey } from "./components/DebuggerStatusBadge";
import { totalHookExecutionWritesFromEvent } from "./hook-execution-presentation";
import {
  eventMatchesHookExecutionStatusFilter,
  eventMatchesHookExecutionType,
  HOOK_EXECUTION_STATUS_FILTERS,
  HOOK_EXECUTION_TYPE_KEYS,
  hookExecutionTypeForEvent,
  hookExecutionTypeLabelKey,
  isHookExecutionSkippedEvent,
  parseHookExecutionStatusFilters,
  parseHookExecutionTypes,
  rawStatusIncludesSkipped,
  type HookExecutionStatusFilter,
  type HookExecutionTypeKey,
} from "./hook-execution-live-metrics";
import {
  eventMatchesHookResolutionSource,
  HOOK_RESOLUTION_SOURCE_KEYS,
  hookResolutionSourceLabelKey,
  parseHookResolutionSources,
  type HookResolutionSourceKey,
} from "./hook-resolution-source";
import {
  AI_JOB_FEATURE_KEYS,
  aiJobFeatureForEvent,
  aiJobFeatureLabelKey,
  parseAiJobFeatures,
  type AiJobFeatureKey,
} from "./ai-job-features";

type DebuggerListStatusFilter = DebugEventStatus | HookExecutionStatusFilter;

interface DebuggerListQuery {
  readonly search: string;
  readonly statuses: readonly DebuggerListStatusFilter[];
  readonly executionTypes: readonly HookExecutionTypeKey[];
  readonly resolutionSources: readonly HookResolutionSourceKey[];
  readonly aiFeatures: readonly AiJobFeatureKey[];
  readonly minWrites: number;
  readonly minDurationMs: number;
  readonly sort: DebuggerListSort;
  readonly showSkipped: boolean;
}

interface DebuggerListFilterBadge {
  readonly id: string;
  readonly label: string;
  readonly onRemove: () => void;
}

function parseStatuses(
  raw: string | null,
  source: DebugEventSource,
): DebuggerListStatusFilter[] {
  if (!raw?.trim()) {
    return [];
  }

  if (source === "hookExecution") {
    return parseHookExecutionStatusFilters(raw);
  }

  const allowed = new Set(DEBUGGER_STATUSES_BY_SOURCE[source]);
  return raw
    .split(",")
    .map((entry) => entry.trim())
    .filter((entry): entry is DebugEventStatus =>
      allowed.has(entry as DebugEventStatus),
    );
}

function eventMatchesStatusFilter(
  event: DebugEvent,
  source: DebugEventSource,
  statusFilter: DebuggerListStatusFilter,
): boolean {
  if (source === "hookExecution") {
    return eventMatchesHookExecutionStatusFilter(
      event,
      statusFilter as HookExecutionStatusFilter,
    );
  }

  return event.status === statusFilter;
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

export function parsePositiveInt(raw: string | null): number {
  if (!raw?.trim()) {
    return 0;
  }
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

export function useDebuggerListQuery(
  sourceEvents: readonly DebugEvent[],
  activeSource: DebugEventSource,
  timeBounds?: { readonly sinceIso: string; readonly untilIso: string } | null,
) {
  const [searchParams, setSearchParams] = useSearchParams();

  const query = useMemo((): DebuggerListQuery => {
    const rawSort = searchParams.get("sort") ?? DEFAULT_DEBUGGER_LIST_SORT;
    const rawStatus = searchParams.get("status");
    const showSkippedParam = searchParams.get("showSkipped") === "1";
    return {
      search: readListQuerySearch(searchParams),
      statuses: parseStatuses(rawStatus, activeSource),
      executionTypes:
        activeSource === "hookExecution"
          ? parseHookExecutionTypes(searchParams.get("executionType"))
          : [],
      resolutionSources:
        activeSource === "hookExecution"
          ? parseHookResolutionSources(searchParams.get("resolutionSource"))
          : [],
      aiFeatures:
        activeSource === "ai"
          ? parseAiJobFeatures(searchParams.get("aiFeature"))
          : [],
      minWrites:
        activeSource === "hookExecution"
          ? parsePositiveInt(searchParams.get("minWrites"))
          : 0,
      minDurationMs:
        activeSource === "hookExecution"
          ? parsePositiveInt(searchParams.get("minDuration"))
          : 0,
      sort: isDebuggerListSort(rawSort) ? rawSort : DEFAULT_DEBUGGER_LIST_SORT,
      showSkipped:
        activeSource === "hookExecution" &&
        (showSkippedParam || rawStatusIncludesSkipped(rawStatus)),
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
        writeListQuerySearch(next, search);
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
    (status: DebuggerListStatusFilter) => {
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

  const setShowSkipped = useCallback(
    (showSkipped: boolean) => {
      if (activeSource !== "hookExecution") {
        return;
      }
      updateSearchParams((next) => {
        if (showSkipped) {
          next.set("showSkipped", "1");
        } else {
          next.delete("showSkipped");
        }
        // Drop legacy status=skipped once the dedicated toggle owns it.
        const statuses = parseStatuses(next.get("status"), activeSource);
        if (statuses.length === 0) {
          next.delete("status");
        } else {
          next.set("status", statuses.join(","));
        }
      });
    },
    [activeSource, updateSearchParams],
  );

  const toggleShowSkipped = useCallback(() => {
    setShowSkipped(!query.showSkipped);
  }, [query.showSkipped, setShowSkipped]);

  const toggleExecutionType = useCallback(
    (executionType: HookExecutionTypeKey) => {
      if (activeSource !== "hookExecution") {
        return;
      }
      updateSearchParams((next) => {
        const current = parseHookExecutionTypes(next.get("executionType"));
        const exists = current.includes(executionType);
        const updated = exists
          ? current.filter((entry) => entry !== executionType)
          : [...current, executionType];

        if (updated.length === 0) {
          next.delete("executionType");
        } else {
          next.set("executionType", updated.join(","));
        }
      });
    },
    [activeSource, updateSearchParams],
  );

  const toggleResolutionSource = useCallback(
    (resolutionSource: HookResolutionSourceKey) => {
      if (activeSource !== "hookExecution") {
        return;
      }
      updateSearchParams((next) => {
        const current = parseHookResolutionSources(
          next.get("resolutionSource"),
        );
        const exists = current.includes(resolutionSource);
        const updated = exists
          ? current.filter((entry) => entry !== resolutionSource)
          : [...current, resolutionSource];

        if (updated.length === 0) {
          next.delete("resolutionSource");
        } else {
          next.set("resolutionSource", updated.join(","));
        }
      });
    },
    [activeSource, updateSearchParams],
  );

  const toggleAiFeature = useCallback(
    (feature: AiJobFeatureKey) => {
      if (activeSource !== "ai") {
        return;
      }
      updateSearchParams((next) => {
        const current = parseAiJobFeatures(next.get("aiFeature"));
        const exists = current.includes(feature);
        const updated = exists
          ? current.filter((entry) => entry !== feature)
          : [...current, feature];

        if (updated.length === 0) {
          next.delete("aiFeature");
        } else {
          next.set("aiFeature", updated.join(","));
        }
      });
    },
    [activeSource, updateSearchParams],
  );

  const setMinWrites = useCallback(
    (value: number) => {
      if (activeSource !== "hookExecution") {
        return;
      }
      updateSearchParams((next) => {
        if (value <= 0) {
          next.delete("minWrites");
        } else {
          next.set("minWrites", String(value));
        }
      });
    },
    [activeSource, updateSearchParams],
  );

  const setMinDurationMs = useCallback(
    (value: number) => {
      if (activeSource !== "hookExecution") {
        return;
      }
      updateSearchParams((next) => {
        if (value <= 0) {
          next.delete("minDuration");
        } else {
          next.set("minDuration", String(value));
        }
      });
    },
    [activeSource, updateSearchParams],
  );

  const clearFilters = useCallback(() => {
    updateSearchParams((next) => {
      next.delete("q");
      next.delete("status");
      next.delete("executionType");
      next.delete("resolutionSource");
      next.delete("aiFeature");
      next.delete("typology");
      next.delete("minWrites");
      next.delete("minDuration");
      next.delete("showSkipped");
      next.delete("sort");
    });
  }, [updateSearchParams]);

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

      if (
        activeSource === "hookExecution" &&
        !query.showSkipped &&
        isHookExecutionSkippedEvent(event)
      ) {
        return false;
      }

      if (
        query.statuses.length > 0 &&
        !query.statuses.some((status) =>
          eventMatchesStatusFilter(event, activeSource, status),
        )
      ) {
        return false;
      }

      if (
        activeSource === "hookExecution" &&
        query.executionTypes.length > 0 &&
        !query.executionTypes.some((executionType) =>
          eventMatchesHookExecutionType(event, executionType),
        )
      ) {
        return false;
      }

      if (
        activeSource === "hookExecution" &&
        query.resolutionSources.length > 0 &&
        !query.resolutionSources.some((resolutionSource) =>
          eventMatchesHookResolutionSource(event, resolutionSource),
        )
      ) {
        return false;
      }

      if (
        activeSource === "ai" &&
        query.aiFeatures.length > 0 &&
        !query.aiFeatures.some(
          (feature) => aiJobFeatureForEvent(event) === feature,
        )
      ) {
        return false;
      }

      if (
        activeSource === "hookExecution" &&
        query.minWrites > 0 &&
        totalHookExecutionWritesFromEvent(event) < query.minWrites
      ) {
        return false;
      }

      if (
        activeSource === "hookExecution" &&
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
    activeSource,
    query.aiFeatures,
    query.executionTypes,
    query.resolutionSources,
    query.minDurationMs,
    query.minWrites,
    query.search,
    query.showSkipped,
    query.statuses,
    sourceEvents,
    timeBounds,
  ]);

  const listEvents = useMemo(
    () => sortDebuggerEvents(filteredEvents, query.sort),
    [filteredEvents, query.sort],
  );

  const statusCounts = useMemo(() => {
    const counts: Partial<Record<DebuggerListStatusFilter, number>> = {};

    for (const event of filteredEvents) {
      if (activeSource === "hookExecution") {
        if (event.status === "pending") {
          counts.queued = (counts.queued ?? 0) + 1;
          continue;
        }
      }

      if (!event.status) {
        continue;
      }

      counts[event.status] = (counts[event.status] ?? 0) + 1;
    }

    return counts;
  }, [activeSource, filteredEvents]);

  const executionTypeCounts = useMemo(() => {
    const counts: Partial<Record<HookExecutionTypeKey, number>> = {};

    if (activeSource !== "hookExecution") {
      return counts;
    }

    for (const event of filteredEvents) {
      const executionType = hookExecutionTypeForEvent(event);
      if (!executionType) {
        continue;
      }
      counts[executionType] = (counts[executionType] ?? 0) + 1;
    }

    return counts;
  }, [activeSource, filteredEvents]);

  const hasActiveFilters =
    query.search.trim().length > 0 ||
    query.statuses.length > 0 ||
    query.executionTypes.length > 0 ||
    query.resolutionSources.length > 0 ||
    query.aiFeatures.length > 0 ||
    query.minWrites > 0 ||
    query.minDurationMs > 0 ||
    query.showSkipped ||
    query.sort !== DEFAULT_DEBUGGER_LIST_SORT;

  const activeFilterBadges = useMemo((): DebuggerListFilterBadge[] => {
    const badges: DebuggerListFilterBadge[] = [];

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

    for (const resolutionSource of query.resolutionSources) {
      badges.push({
        id: `resolutionSource:${resolutionSource}`,
        label: resolutionSource,
        onRemove: () => toggleResolutionSource(resolutionSource),
      });
    }

    for (const feature of query.aiFeatures) {
      badges.push({
        id: `aiFeature:${feature}`,
        label: feature,
        onRemove: () => toggleAiFeature(feature),
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
    query.aiFeatures,
    query.executionTypes,
    query.resolutionSources,
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
    toggleAiFeature,
    toggleExecutionType,
    toggleResolutionSource,
    toggleStatus,
  ]);

  const availableStatuses: readonly DebuggerListStatusFilter[] =
    activeSource === "hookExecution"
      ? HOOK_EXECUTION_STATUS_FILTERS
      : DEBUGGER_STATUSES_BY_SOURCE[activeSource];
  const availableExecutionTypes =
    activeSource === "hookExecution" ? HOOK_EXECUTION_TYPE_KEYS : [];
  const availableResolutionSources =
    activeSource === "hookExecution" ? HOOK_RESOLUTION_SOURCE_KEYS : [];
  const availableAiFeatures = activeSource === "ai" ? AI_JOB_FEATURE_KEYS : [];

  return {
    query,
    listEvents,
    filteredEvents,
    statusCounts,
    executionTypeCounts,
    availableStatuses,
    availableExecutionTypes,
    availableResolutionSources,
    availableAiFeatures,
    hasActiveFilters,
    activeFilterBadges,
    setSearch,
    setSort,
    toggleStatus,
    toggleShowSkipped,
    setShowSkipped,
    toggleExecutionType,
    toggleResolutionSource,
    toggleAiFeature,
    setMinWrites,
    setMinDurationMs,
    clearFilters,
    debuggerStatusLabelKey,
    hookExecutionTypeLabelKey,
    hookResolutionSourceLabelKey,
    aiJobFeatureLabelKey,
  };
}
