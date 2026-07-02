import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { useSearchParams } from "react-router";
import { useTranslation } from "react-i18next";

import { useAuth } from "../../auth/AuthContext";
import {
  listDebugEvents,
  type DebugEvent,
  type DebugEventSource,
  type HookExecutionLiveCounts,
} from "../../lib/api-client";
import {
  buildDebugRecordKey,
  dismissDebugRecord,
  getDismissedDebugRecordIds,
} from "./dismissed-debug-records";
import {
  DEBUGGER_SOURCE_API_NAMES,
  DEBUGGER_SOURCE_ORDER,
} from "./debugger-source-config";
import {
  mergeAccumulatedDebugEvents,
  sortDebugEventsByTimestamp,
} from "./merge-accumulated-debug-events";

const DEBUGGER_HOOK_EXECUTION_PAGE_LIMIT = 100;
const MAX_AUTO_LOADED_HOOK_EXECUTIONS = 2000;

interface DebuggerContextValue {
  readonly activeSource: DebugEventSource;
  readonly events: readonly DebugEvent[];
  readonly visibleEvents: readonly DebugEvent[];
  readonly sourceEvents: readonly DebugEvent[];
  readonly groupedEvents: Readonly<
    Record<DebugEventSource, readonly DebugEvent[]>
  >;
  readonly selectedRecordKey: string | null;
  readonly selectedIndexSignature: string | null;
  readonly selectedEvent: DebugEvent | null;
  readonly hookExecutionLive: HookExecutionLiveCounts | null;
  readonly hasMoreEvents: boolean;
  readonly isLoadingMore: boolean;
  readonly isLoadingAllExecutions: boolean;
  readonly loadedExecutionCount: number;
  readonly loadMore: () => void;
  readonly isLoading: boolean;
  readonly loadError: string | null;
  readonly selectRecord: (event: DebugEvent) => void;
  readonly selectIndexJob: (signature: string) => void;
  readonly clearSelectedRecord: () => void;
  readonly dismissRecord: (event: DebugEvent) => void;
  readonly refresh: () => void;
}

const DebuggerContext = createContext<DebuggerContextValue | null>(null);

export function DebuggerProvider({
  activeSource,
  children,
}: {
  readonly activeSource: DebugEventSource;
  readonly children: ReactNode;
}) {
  const { t } = useTranslation("common");
  const { isReady, tenantId } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [dismissedRevision, setDismissedRevision] = useState(0);
  const [accumulatedEvents, setAccumulatedEvents] = useState<
    ReadonlyMap<string, DebugEvent>
  >(() => new Map());

  const eventsQuery = useInfiniteQuery({
    queryKey: ["debugger-events", tenantId, activeSource],
    queryFn: ({ pageParam }) =>
      listDebugEvents({
        limit: DEBUGGER_HOOK_EXECUTION_PAGE_LIMIT,
        sources: [DEBUGGER_SOURCE_API_NAMES[activeSource]],
        ...(pageParam ? { cursor: pageParam } : {}),
      }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    enabled: isReady && Boolean(tenantId),
    refetchInterval: (query) => {
      if (activeSource === "ai") {
        const pages = query.state.data?.pages ?? [];
        const hasRunningAi = pages.some((page) =>
          page.items.some(
            (item) =>
              item.source === "ai" &&
              (item.status === "running" || item.status === "pending"),
          ),
        );
        return hasRunningAi ? 2000 : false;
      }
      if (activeSource === "hookExecution") {
        const live = query.state.data?.pages[0]?.hookExecutionLive;
        const hasLiveHooks =
          (live?.pending ?? 0) > 0 || (live?.running ?? 0) > 0;
        return hasLiveHooks ? 2000 : false;
      }
      return false;
    },
  });

  useEffect(() => {
    setAccumulatedEvents(new Map());
  }, [activeSource, tenantId]);

  useEffect(() => {
    const pages = eventsQuery.data?.pages;
    if (!pages?.length) {
      return;
    }

    setAccumulatedEvents((current) => {
      const merged = mergeAccumulatedDebugEvents(current, pages);
      if (merged.size === current.size) {
        let unchanged = true;
        for (const [key, event] of merged) {
          if (current.get(key) !== event) {
            unchanged = false;
            break;
          }
        }
        if (unchanged) {
          return current;
        }
      }
      return merged;
    });
  }, [eventsQuery.data?.pages]);

  useEffect(() => {
    if (activeSource !== "hookExecution") {
      return;
    }
    if (!eventsQuery.hasNextPage) {
      return;
    }
    if (eventsQuery.isFetchingNextPage || eventsQuery.isFetching) {
      return;
    }
    if (accumulatedEvents.size >= MAX_AUTO_LOADED_HOOK_EXECUTIONS) {
      return;
    }
    void eventsQuery.fetchNextPage();
  }, [accumulatedEvents.size, activeSource, eventsQuery]);

  const allEvents = useMemo(
    () => sortDebugEventsByTimestamp(accumulatedEvents.values()),
    [accumulatedEvents],
  );

  const dismissedIds = useMemo(() => {
    void dismissedRevision;
    return getDismissedDebugRecordIds();
  }, [dismissedRevision]);

  const visibleEvents = useMemo(() => {
    return allEvents.filter(
      (event) => !dismissedIds.has(buildDebugRecordKey(event.source, event.id)),
    );
  }, [allEvents, dismissedIds]);

  const sourceEvents = useMemo(
    () => visibleEvents.filter((event) => event.source === activeSource),
    [activeSource, visibleEvents],
  );

  const groupedEvents = useMemo(() => {
    const groups = Object.fromEntries(
      DEBUGGER_SOURCE_ORDER.map((source) => [source, [] as DebugEvent[]]),
    ) as Record<DebugEventSource, DebugEvent[]>;

    for (const event of visibleEvents) {
      groups[event.source]?.push(event);
    }

    return groups;
  }, [visibleEvents]);

  const selectedRecordKey = searchParams.get("record");
  const selectedIndexSignature = searchParams.get("index");

  const selectedEvent = useMemo(() => {
    if (!selectedRecordKey) {
      return null;
    }
    return (
      sourceEvents.find(
        (event) =>
          buildDebugRecordKey(event.source, event.id) === selectedRecordKey ||
          event.id === selectedRecordKey,
      ) ?? null
    );
  }, [selectedRecordKey, sourceEvents]);

  useEffect(() => {
    const next = new URLSearchParams(searchParams);
    next.delete("source");
    if (next.toString() !== searchParams.toString()) {
      setSearchParams(next, { replace: true });
    }
  }, [activeSource, searchParams, setSearchParams]);

  useEffect(() => {
    if (!selectedRecordKey || selectedEvent) {
      return;
    }
    const next = new URLSearchParams(searchParams);
    next.delete("record");
    setSearchParams(next, { replace: true });
  }, [searchParams, selectedEvent, selectedRecordKey, setSearchParams]);

  const selectRecord = useCallback(
    (event: DebugEvent) => {
      const next = new URLSearchParams(searchParams);
      next.set("record", buildDebugRecordKey(event.source, event.id));
      next.delete("index");
      setSearchParams(next, { replace: true });
    },
    [searchParams, setSearchParams],
  );

  const selectIndexJob = useCallback(
    (signature: string) => {
      const next = new URLSearchParams(searchParams);
      next.set("index", signature);
      next.delete("record");
      setSearchParams(next, { replace: true });
    },
    [searchParams, setSearchParams],
  );

  const clearSelectedRecord = useCallback(() => {
    const next = new URLSearchParams(searchParams);
    next.delete("record");
    next.delete("index");
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams]);

  const dismissRecord = useCallback((event: DebugEvent) => {
    dismissDebugRecord(buildDebugRecordKey(event.source, event.id));
    setDismissedRevision((current) => current + 1);
  }, []);

  const refresh = useCallback(() => {
    void eventsQuery.refetch();
  }, [eventsQuery]);

  const hookExecutionLive = useMemo((): HookExecutionLiveCounts | null => {
    if (activeSource !== "hookExecution") {
      return null;
    }
    return eventsQuery.data?.pages[0]?.hookExecutionLive ?? null;
  }, [activeSource, eventsQuery.data?.pages]);

  const loadMore = useCallback(() => {
    if (eventsQuery.hasNextPage && !eventsQuery.isFetchingNextPage) {
      void eventsQuery.fetchNextPage();
    }
  }, [eventsQuery]);

  const loadedExecutionCount = useMemo(() => {
    if (activeSource !== "hookExecution") {
      return 0;
    }
    return sourceEvents.length;
  }, [activeSource, sourceEvents.length]);

  const isLoadingAllExecutions =
    activeSource === "hookExecution" &&
    (eventsQuery.isFetchingNextPage ||
      (Boolean(eventsQuery.hasNextPage) &&
        accumulatedEvents.size < MAX_AUTO_LOADED_HOOK_EXECUTIONS));

  const value = useMemo(
    (): DebuggerContextValue => ({
      activeSource,
      events: allEvents,
      visibleEvents,
      sourceEvents,
      groupedEvents,
      selectedRecordKey,
      selectedIndexSignature,
      selectedEvent,
      hookExecutionLive,
      hasMoreEvents: Boolean(eventsQuery.hasNextPage),
      isLoadingMore: eventsQuery.isFetchingNextPage,
      isLoadingAllExecutions,
      loadedExecutionCount,
      loadMore,
      isLoading: eventsQuery.isLoading,
      loadError: eventsQuery.error
        ? eventsQuery.error instanceof Error
          ? eventsQuery.error.message
          : t("debugger.loadError")
        : null,
      selectRecord,
      selectIndexJob,
      clearSelectedRecord,
      dismissRecord,
      refresh,
    }),
    [
      activeSource,
      allEvents,
      clearSelectedRecord,
      dismissRecord,
      eventsQuery.hasNextPage,
      eventsQuery.isFetchingNextPage,
      eventsQuery.isLoading,
      eventsQuery.error,
      groupedEvents,
      hookExecutionLive,
      isLoadingAllExecutions,
      loadedExecutionCount,
      loadMore,
      refresh,
      selectIndexJob,
      selectRecord,
      selectedEvent,
      selectedIndexSignature,
      selectedRecordKey,
      sourceEvents,
      t,
      visibleEvents,
    ],
  );

  return (
    <DebuggerContext.Provider value={value}>
      {children}
    </DebuggerContext.Provider>
  );
}

export function useDebugger(): DebuggerContextValue {
  const context = useContext(DebuggerContext);
  if (!context) {
    throw new Error("useDebugger must be used within DebuggerProvider");
  }
  return context;
}
