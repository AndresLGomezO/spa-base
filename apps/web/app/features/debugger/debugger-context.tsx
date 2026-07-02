import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "react-router";
import { useTranslation } from "react-i18next";

import { useAuth } from "../../auth/AuthContext";
import {
  listDebugEvents,
  type DebugEvent,
  type DebugEventSource,
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

  const eventsQuery = useQuery({
    queryKey: ["debugger-events", tenantId, activeSource],
    queryFn: () =>
      listDebugEvents({
        limit: 50,
        sources: [DEBUGGER_SOURCE_API_NAMES[activeSource]],
      }),
    enabled: isReady && Boolean(tenantId),
    refetchInterval: (query) => {
      if (activeSource !== "ai") {
        return false;
      }
      const hasRunningAi = query.state.data?.items.some(
        (item) =>
          item.source === "ai" &&
          (item.status === "running" || item.status === "pending"),
      );
      return hasRunningAi ? 2000 : false;
    },
  });

  const dismissedIds = useMemo(() => {
    void dismissedRevision;
    return getDismissedDebugRecordIds();
  }, [dismissedRevision]);

  const visibleEvents = useMemo(() => {
    return (eventsQuery.data?.items ?? []).filter(
      (event) => !dismissedIds.has(buildDebugRecordKey(event.source, event.id)),
    );
  }, [dismissedIds, eventsQuery.data?.items]);

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

  const value = useMemo(
    (): DebuggerContextValue => ({
      activeSource,
      events: eventsQuery.data?.items ?? [],
      visibleEvents,
      sourceEvents,
      groupedEvents,
      selectedRecordKey,
      selectedIndexSignature,
      selectedEvent,
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
      clearSelectedRecord,
      dismissRecord,
      eventsQuery.data?.items,
      eventsQuery.error,
      eventsQuery.isLoading,
      groupedEvents,
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
