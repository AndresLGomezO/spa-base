import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "react-router";
import { useTranslation } from "react-i18next";

import { useAuth } from "../../auth/AuthContext";
import {
  getDebugEventsSummary,
  listDebugEvents,
  type DebugEvent,
  type DebugEventSource,
  type DebugEventsSummary,
  type HookExecutionLiveCounts,
} from "../../lib/api-client";
import {
  buildDebugRecordKey,
  dismissDebugRecord,
  getDismissedDebugRecordIds,
} from "./dismissed-debug-records";
import {
  clearDebuggerDeepLinkSeed,
  readDebuggerDeepLinkSeed,
} from "./debugger-deep-link-seed";
import {
  DEBUGGER_SOURCE_API_NAMES,
  DEBUGGER_SOURCE_ORDER,
} from "./debugger-source-config";
import {
  parseDebuggerPageSize,
  writeDebuggerPageSize,
  type DebuggerPageSize,
} from "./debugger-page-size";
import { TENANT_INDEX_PROCESS_LIST_QUERY_KEY } from "./index-provisioning-query-keys";
import { sortDebugEventsByTimestamp } from "./merge-accumulated-debug-events";
import { useDebuggerTimeRange } from "./use-debugger-time-range";

function eventKey(event: DebugEvent): string {
  return buildDebugRecordKey(event.source, event.id);
}

function mergeEventMap(
  current: ReadonlyMap<string, DebugEvent>,
  incoming: readonly DebugEvent[],
): Map<string, DebugEvent> {
  const next = new Map(current);
  for (const event of incoming) {
    next.set(eventKey(event), event);
  }
  return next;
}

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
  readonly windowSummary: DebugEventsSummary | null;
  readonly isSummaryLoading: boolean;
  readonly hasMoreOlder: boolean;
  readonly hasMoreNewer: boolean;
  readonly isLoadingOlder: boolean;
  readonly isLoadingNewer: boolean;
  readonly loadOlder: () => Promise<void>;
  readonly loadNewer: () => Promise<void>;
  readonly pageSize: DebuggerPageSize;
  readonly setPageSize: (pageSize: DebuggerPageSize) => void;
  readonly isLoading: boolean;
  readonly isRefreshing: boolean;
  readonly isFetching: boolean;
  readonly lastUpdatedAt: number | null;
  readonly refreshGeneration: number;
  readonly loadError: string | null;
  readonly timeRangeSelectionKey: string;
  readonly timeRangeBounds: {
    readonly sinceIso: string;
    readonly untilIso: string;
  };
  readonly selectRecord: (event: DebugEvent) => void;
  readonly selectIndexJob: (signature: string) => void;
  readonly clearSelectedRecord: () => void;
  readonly dismissRecord: (event: DebugEvent) => void;
  readonly refresh: () => Promise<void>;
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
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const [dismissedRevision, setDismissedRevision] = useState(0);
  const [isManualRefreshing, setIsManualRefreshing] = useState(false);
  const [isLoadingOlder, setIsLoadingOlder] = useState(false);
  const [isLoadingNewer, setIsLoadingNewer] = useState(false);
  const [refreshGeneration, setRefreshGeneration] = useState(0);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<number | null>(null);
  const [accumulatedEvents, setAccumulatedEvents] = useState<
    ReadonlyMap<string, DebugEvent>
  >(() => new Map());
  const [olderCursor, setOlderCursor] = useState<string | null>(null);
  const [hasMoreOlder, setHasMoreOlder] = useState(false);
  const [hasMoreNewer, setHasMoreNewer] = useState(false);

  const { selectionKey: timeRangeSelectionKey, resolveBounds } =
    useDebuggerTimeRange();

  const pageSize = useMemo(
    () => parseDebuggerPageSize(searchParams.get("pageSize")),
    [searchParams],
  );

  const scopedEntityName = searchParams.get("entityName")?.trim() || undefined;
  const scopedRecordId = searchParams.get("recordId")?.trim() || undefined;
  const scopedEmailLedgerId =
    searchParams.get("emailLedgerId")?.trim() || undefined;
  const hasEmailLedgerScope = Boolean(scopedEmailLedgerId);
  const hasEntityRecordScope =
    !hasEmailLedgerScope && Boolean(scopedEntityName && scopedRecordId);
  const listScopeParams = useMemo(
    () =>
      hasEmailLedgerScope
        ? { emailLedgerId: scopedEmailLedgerId }
        : hasEntityRecordScope
          ? { entityName: scopedEntityName, recordId: scopedRecordId }
          : {},
    [
      hasEmailLedgerScope,
      hasEntityRecordScope,
      scopedEmailLedgerId,
      scopedEntityName,
      scopedRecordId,
    ],
  );

  const listQueryKey = useMemo(
    () =>
      [
        "debugger-events",
        tenantId,
        activeSource,
        timeRangeSelectionKey,
        pageSize,
        scopedEmailLedgerId ?? null,
        scopedEntityName ?? null,
        scopedRecordId ?? null,
      ] as const,
    [
      activeSource,
      pageSize,
      scopedEmailLedgerId,
      scopedEntityName,
      scopedRecordId,
      tenantId,
      timeRangeSelectionKey,
    ],
  );

  const summaryQueryKey = useMemo(
    () =>
      [
        "debugger-events-summary",
        tenantId,
        activeSource,
        timeRangeSelectionKey,
        scopedEmailLedgerId ?? null,
        scopedEntityName ?? null,
        scopedRecordId ?? null,
      ] as const,
    [
      activeSource,
      scopedEmailLedgerId,
      scopedEntityName,
      scopedRecordId,
      tenantId,
      timeRangeSelectionKey,
    ],
  );

  const eventsQuery = useQuery({
    queryKey: listQueryKey,
    queryFn: () => {
      const bounds = resolveBounds(new Date());
      return listDebugEvents({
        limit: pageSize,
        sources: [DEBUGGER_SOURCE_API_NAMES[activeSource]],
        since: bounds.sinceIso,
        until: bounds.untilIso,
        ...listScopeParams,
      });
    },
    enabled: isReady && Boolean(tenantId),
  });

  const summaryQuery = useQuery({
    queryKey: summaryQueryKey,
    queryFn: () => {
      const bounds = resolveBounds(new Date());
      return getDebugEventsSummary({
        sources: [DEBUGGER_SOURCE_API_NAMES[activeSource]],
        since: bounds.sinceIso,
        until: bounds.untilIso,
      });
    },
    enabled: isReady && Boolean(tenantId),
  });

  useEffect(() => {
    setAccumulatedEvents(new Map());
    setOlderCursor(null);
    setHasMoreOlder(false);
    setHasMoreNewer(false);
    setLastUpdatedAt(null);
  }, [
    activeSource,
    scopedEmailLedgerId,
    scopedEntityName,
    scopedRecordId,
    tenantId,
    timeRangeSelectionKey,
    pageSize,
  ]);

  const selectedRecordKey = searchParams.get("record");
  const selectedIndexSignature = searchParams.get("index");

  const deepLinkSeed = useMemo(
    () => readDebuggerDeepLinkSeed(selectedRecordKey),
    // Re-read when the URL record changes; seed is written before navigation.
    [selectedRecordKey],
  );

  useEffect(() => {
    const page = eventsQuery.data;
    if (!page || eventsQuery.isFetching) {
      return;
    }
    setAccumulatedEvents(() => {
      const next = new Map(
        page.items.map((event) => [eventKey(event), event] as const),
      );
      if (deepLinkSeed) {
        next.set(eventKey(deepLinkSeed), deepLinkSeed);
      }
      return next;
    });
    setOlderCursor(page.nextCursor ?? null);
    setHasMoreOlder(Boolean(page.nextCursor) || page.items.length >= pageSize);
    setHasMoreNewer(false);
    setLastUpdatedAt(eventsQuery.dataUpdatedAt);
  }, [
    deepLinkSeed,
    eventsQuery.data,
    eventsQuery.dataUpdatedAt,
    eventsQuery.isFetching,
    pageSize,
  ]);

  // Keep a deep-linked seed visible even before the first list page arrives.
  useEffect(() => {
    if (!deepLinkSeed) {
      return;
    }
    setAccumulatedEvents((current) => {
      const key = eventKey(deepLinkSeed);
      if (current.get(key) === deepLinkSeed) {
        return current;
      }
      const next = new Map(current);
      next.set(key, deepLinkSeed);
      return next;
    });
  }, [deepLinkSeed]);

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

  const newestLoadedTimestamp = sourceEvents[0]?.timestamp ?? null;
  const oldestLoadedTimestamp =
    sourceEvents.length > 0
      ? (sourceEvents[sourceEvents.length - 1]?.timestamp ?? null)
      : null;

  const groupedEvents = useMemo(() => {
    const groups = Object.fromEntries(
      DEBUGGER_SOURCE_ORDER.map((source) => [source, [] as DebugEvent[]]),
    ) as Record<DebugEventSource, DebugEvent[]>;

    for (const event of visibleEvents) {
      groups[event.source]?.push(event);
    }

    return groups;
  }, [visibleEvents]);

  const matchesSelectedRecord = useCallback(
    (event: DebugEvent) => {
      if (!selectedRecordKey) {
        return false;
      }
      return (
        buildDebugRecordKey(event.source, event.id) === selectedRecordKey ||
        event.id === selectedRecordKey
      );
    },
    [selectedRecordKey],
  );

  const selectedEvent = useMemo(() => {
    if (!selectedRecordKey) {
      return null;
    }
    return (
      sourceEvents.find(matchesSelectedRecord) ??
      eventsQuery.data?.items.find(matchesSelectedRecord) ??
      (deepLinkSeed && matchesSelectedRecord(deepLinkSeed)
        ? deepLinkSeed
        : null)
    );
  }, [
    deepLinkSeed,
    eventsQuery.data?.items,
    matchesSelectedRecord,
    selectedRecordKey,
    sourceEvents,
  ]);

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
    // Wait until the initial page has settled. Clearing during the empty
    // pre-hydrate window drops deep links like ?record=hookExecution:….
    if (
      eventsQuery.isPending ||
      eventsQuery.isFetching ||
      !eventsQuery.isFetched
    ) {
      return;
    }
    // Seeded deep links (third-rail → new tab) may miss the first page; keep
    // the URL until the seed expires or the user dismisses selection.
    if (deepLinkSeed) {
      return;
    }
    // Scoped lists can page; do not drop the deep link while older pages remain.
    if (
      (hasEntityRecordScope || hasEmailLedgerScope) &&
      (hasMoreOlder || isLoadingOlder)
    ) {
      return;
    }
    const next = new URLSearchParams(searchParams);
    next.delete("record");
    setSearchParams(next, { replace: true });
  }, [
    deepLinkSeed,
    eventsQuery.isFetched,
    eventsQuery.isFetching,
    eventsQuery.isPending,
    hasEmailLedgerScope,
    hasEntityRecordScope,
    hasMoreOlder,
    isLoadingOlder,
    searchParams,
    selectedEvent,
    selectedRecordKey,
    setSearchParams,
  ]);

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
    clearDebuggerDeepLinkSeed(selectedRecordKey);
    const next = new URLSearchParams(searchParams);
    next.delete("record");
    next.delete("index");
    setSearchParams(next, { replace: true });
  }, [searchParams, selectedRecordKey, setSearchParams]);

  const dismissRecord = useCallback((event: DebugEvent) => {
    dismissDebugRecord(buildDebugRecordKey(event.source, event.id));
    setDismissedRevision((current) => current + 1);
  }, []);

  const setPageSize = useCallback(
    (nextSize: DebuggerPageSize) => {
      const next = new URLSearchParams(searchParams);
      writeDebuggerPageSize(next, nextSize);
      setSearchParams(next, { replace: true });
    },
    [searchParams, setSearchParams],
  );

  const refresh = useCallback(async () => {
    setIsManualRefreshing(true);
    try {
      setAccumulatedEvents(new Map());
      setOlderCursor(null);
      setHasMoreOlder(false);
      setHasMoreNewer(false);
      await Promise.all([
        queryClient.resetQueries({ queryKey: listQueryKey }),
        queryClient.invalidateQueries({ queryKey: summaryQueryKey }),
        activeSource === "indexProvision"
          ? queryClient.invalidateQueries({
              queryKey: [TENANT_INDEX_PROCESS_LIST_QUERY_KEY],
            })
          : Promise.resolve(),
      ]);
      setRefreshGeneration((current) => current + 1);
      setLastUpdatedAt(Date.now());
    } finally {
      setIsManualRefreshing(false);
    }
  }, [activeSource, listQueryKey, queryClient, summaryQueryKey]);

  const loadOlder = useCallback(async () => {
    if (isLoadingOlder || !hasMoreOlder) {
      return;
    }
    setIsLoadingOlder(true);
    try {
      const bounds = resolveBounds(new Date());
      const page = await listDebugEvents({
        limit: pageSize,
        sources: [DEBUGGER_SOURCE_API_NAMES[activeSource]],
        since: bounds.sinceIso,
        until: bounds.untilIso,
        ...listScopeParams,
        ...(olderCursor
          ? { cursor: olderCursor }
          : oldestLoadedTimestamp
            ? { before: oldestLoadedTimestamp }
            : {}),
      });
      setAccumulatedEvents((current) => mergeEventMap(current, page.items));
      setOlderCursor(page.nextCursor ?? null);
      setHasMoreOlder(
        Boolean(page.nextCursor) || page.items.length >= pageSize,
      );
    } finally {
      setIsLoadingOlder(false);
    }
  }, [
    activeSource,
    hasMoreOlder,
    isLoadingOlder,
    listScopeParams,
    olderCursor,
    oldestLoadedTimestamp,
    pageSize,
    resolveBounds,
  ]);

  const loadNewer = useCallback(async () => {
    if (isLoadingNewer || !newestLoadedTimestamp) {
      return;
    }
    setIsLoadingNewer(true);
    try {
      const bounds = resolveBounds(new Date());
      const page = await listDebugEvents({
        limit: pageSize,
        sources: [DEBUGGER_SOURCE_API_NAMES[activeSource]],
        since: bounds.sinceIso,
        until: bounds.untilIso,
        after: newestLoadedTimestamp,
        ...listScopeParams,
      });
      if (page.items.length === 0) {
        setHasMoreNewer(false);
        return;
      }
      setAccumulatedEvents((current) => mergeEventMap(current, page.items));
      setHasMoreNewer(page.items.length >= pageSize);
    } finally {
      setIsLoadingNewer(false);
    }
  }, [
    activeSource,
    isLoadingNewer,
    listScopeParams,
    newestLoadedTimestamp,
    pageSize,
    resolveBounds,
  ]);

  // Deep-linked record missing from the first page: keep paging older while scoped.
  useEffect(() => {
    if (
      !selectedRecordKey ||
      selectedEvent ||
      !(hasEntityRecordScope || hasEmailLedgerScope) ||
      !hasMoreOlder ||
      isLoadingOlder ||
      eventsQuery.isFetching ||
      !eventsQuery.isFetched
    ) {
      return;
    }
    void loadOlder();
  }, [
    eventsQuery.isFetched,
    eventsQuery.isFetching,
    hasEmailLedgerScope,
    hasEntityRecordScope,
    hasMoreOlder,
    isLoadingOlder,
    loadOlder,
    selectedEvent,
    selectedRecordKey,
  ]);

  // After initial load, allow trying newer if the window's until is after newest loaded.
  useEffect(() => {
    if (!newestLoadedTimestamp || eventsQuery.isFetching) {
      return;
    }
    const bounds = resolveBounds(new Date(lastUpdatedAt ?? Date.now()));
    const newestMs = Date.parse(newestLoadedTimestamp);
    const untilMs = Date.parse(bounds.untilIso);
    if (
      Number.isFinite(newestMs) &&
      Number.isFinite(untilMs) &&
      newestMs < untilMs
    ) {
      setHasMoreNewer(true);
    }
  }, [
    eventsQuery.isFetching,
    lastUpdatedAt,
    newestLoadedTimestamp,
    resolveBounds,
  ]);

  const hookExecutionLive = useMemo((): HookExecutionLiveCounts | null => {
    if (activeSource !== "hookExecution") {
      return null;
    }
    return (
      summaryQuery.data?.hookExecutionLive ??
      eventsQuery.data?.hookExecutionLive ??
      null
    );
  }, [activeSource, eventsQuery.data?.hookExecutionLive, summaryQuery.data]);

  const timeRangeBounds = useMemo(
    () => resolveBounds(new Date(lastUpdatedAt ?? Date.now())),
    [lastUpdatedAt, resolveBounds],
  );

  const isFetching =
    (eventsQuery.isFetching || summaryQuery.isFetching) && !isManualRefreshing;

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
      windowSummary: summaryQuery.data ?? null,
      isSummaryLoading: summaryQuery.isLoading,
      hasMoreOlder,
      hasMoreNewer,
      isLoadingOlder,
      isLoadingNewer,
      loadOlder,
      loadNewer,
      pageSize,
      setPageSize,
      isLoading: eventsQuery.isLoading,
      isRefreshing: isManualRefreshing,
      isFetching,
      lastUpdatedAt,
      refreshGeneration,
      loadError: eventsQuery.error
        ? eventsQuery.error instanceof Error
          ? eventsQuery.error.message
          : t("debugger.loadError")
        : null,
      timeRangeSelectionKey,
      timeRangeBounds,
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
      eventsQuery.error,
      eventsQuery.isLoading,
      groupedEvents,
      hasMoreNewer,
      hasMoreOlder,
      hookExecutionLive,
      isFetching,
      isLoadingNewer,
      isLoadingOlder,
      isManualRefreshing,
      lastUpdatedAt,
      loadNewer,
      loadOlder,
      pageSize,
      refresh,
      refreshGeneration,
      selectIndexJob,
      selectRecord,
      selectedEvent,
      selectedIndexSignature,
      selectedRecordKey,
      setPageSize,
      sourceEvents,
      summaryQuery.data,
      summaryQuery.isLoading,
      t,
      timeRangeBounds,
      timeRangeSelectionKey,
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
