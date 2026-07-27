import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router";

import { toast } from "@repo/ui";

import { useAuth } from "../../auth/AuthContext";
import {
  getUnreadNotificationCount,
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  type UserNotificationRecord,
} from "../../lib/api-client";
import { subscribeToForegroundMessages } from "../../lib/firebase-messaging";
import { invalidateLivePageData } from "../../query/invalidate-live-page-data";
import { PushOptInPrompt } from "./PushOptInPrompt";
import {
  invalidateNotificationQueries,
  NOTIFICATIONS_PREVIEW_LIMIT,
  notificationsQueryKeys,
} from "./notifications-query-keys";
import { useSilentHookExecutionRefresh } from "./use-silent-hook-execution-refresh";

const POLL_INTERVAL_MS = 10_000;
const POLL_INTERVAL_OPEN_MS = 5_000;

interface NotificationsContextValue {
  readonly notifications: readonly UserNotificationRecord[];
  readonly unreadCount: number;
  readonly isLoading: boolean;
  readonly isPanelOpen: boolean;
  readonly setPanelOpen: (open: boolean) => void;
  readonly markRead: (id: string) => Promise<void>;
  readonly markAllRead: () => Promise<void>;
  readonly refresh: () => void;
}

const NotificationsContext = createContext<NotificationsContextValue | null>(
  null,
);

function formatRelativeTime(iso: string, locale: string): string {
  const date = new Date(iso);
  const deltaMs = date.getTime() - Date.now();
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });
  const absSeconds = Math.round(Math.abs(deltaMs) / 1000);
  if (absSeconds < 60) {
    return rtf.format(Math.round(deltaMs / 1000), "second");
  }
  const absMinutes = Math.round(absSeconds / 60);
  if (absMinutes < 60) {
    return rtf.format(Math.round(deltaMs / 60_000), "minute");
  }
  const absHours = Math.round(absMinutes / 60);
  if (absHours < 24) {
    return rtf.format(Math.round(deltaMs / 3_600_000), "hour");
  }
  return rtf.format(Math.round(deltaMs / 86_400_000), "day");
}

export function NotificationsProvider({
  children,
}: {
  readonly children: ReactNode;
}) {
  const { t } = useTranslation("common");
  const { isReady, tenantId } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isPanelOpen, setPanelOpen] = useState(false);
  const seenNotificationIdsRef = useRef<Set<string>>(new Set());
  const initializedSeenRef = useRef(false);
  /** After a foreground FCM toast, skip poll toasts briefly to avoid duplicates. */
  const suppressPollToastUntilRef = useRef(0);

  useSilentHookExecutionRefresh();

  useEffect(() => {
    if (!isReady || !tenantId) {
      return;
    }

    let dispose: (() => void) | undefined;
    let cancelled = false;

    void subscribeToForegroundMessages((payload) => {
      suppressPollToastUntilRef.current = Date.now() + 15_000;
      const message = payload.body?.trim() || payload.title;
      (payload.level === "error" ? toast.error : toast.info)(message, {
        action: {
          label: t("notifications.view"),
          onClick: () => {
            void navigate(payload.url);
          },
        },
      });
      invalidateNotificationQueries(queryClient, tenantId);
    }).then((unsubscribe) => {
      if (cancelled) {
        unsubscribe();
        return;
      }
      dispose = unsubscribe;
    });

    return () => {
      cancelled = true;
      dispose?.();
    };
  }, [isReady, tenantId, queryClient, navigate, t]);

  const notificationsQuery = useQuery({
    queryKey: notificationsQueryKeys.preview(tenantId),
    queryFn: () => listNotifications({ limit: NOTIFICATIONS_PREVIEW_LIMIT }),
    enabled: isReady && Boolean(tenantId),
    refetchInterval: isPanelOpen ? POLL_INTERVAL_OPEN_MS : POLL_INTERVAL_MS,
  });

  const unreadCountQuery = useQuery({
    queryKey: notificationsQueryKeys.unreadCount(tenantId),
    queryFn: getUnreadNotificationCount,
    enabled: isReady && Boolean(tenantId),
    refetchInterval: isPanelOpen ? POLL_INTERVAL_OPEN_MS : POLL_INTERVAL_MS,
  });

  const notifications = useMemo(
    () => notificationsQuery.data?.items ?? [],
    [notificationsQuery.data?.items],
  );
  const unreadCount = unreadCountQuery.data?.unreadCount ?? 0;

  useEffect(() => {
    if (!notificationsQuery.data) {
      return;
    }

    const unseen = notifications.filter(
      (item) => !item.read && !seenNotificationIdsRef.current.has(item.id),
    );

    for (const item of notifications) {
      seenNotificationIdsRef.current.add(item.id);
    }

    if (!initializedSeenRef.current) {
      initializedSeenRef.current = true;
      return;
    }

    const suppressPollToasts = Date.now() < suppressPollToastUntilRef.current;

    if (!suppressPollToasts) {
      for (const item of unseen) {
        toast.info(item.message, {
          description: item.hookName
            ? t("notifications.newFromHook", { hook: item.hookName })
            : undefined,
        });
      }
    }

    if (unseen.length > 0) {
      void invalidateLivePageData(queryClient);
    }
  }, [notifications, notificationsQuery.data, queryClient, t]);

  const refresh = useCallback(() => {
    invalidateNotificationQueries(queryClient, tenantId);
  }, [queryClient, tenantId]);

  const markRead = useCallback(
    async (id: string) => {
      await markNotificationRead(id);
      refresh();
    },
    [refresh],
  );

  const markAllRead = useCallback(async () => {
    await markAllNotificationsRead();
    refresh();
  }, [refresh]);

  const value = useMemo(
    () => ({
      notifications,
      unreadCount,
      isLoading: notificationsQuery.isLoading || unreadCountQuery.isLoading,
      isPanelOpen,
      setPanelOpen,
      markRead,
      markAllRead,
      refresh,
    }),
    [
      markAllRead,
      markRead,
      notifications,
      notificationsQuery.isLoading,
      isPanelOpen,
      refresh,
      unreadCount,
      unreadCountQuery.isLoading,
    ],
  );

  return (
    <NotificationsContext.Provider value={value}>
      <PushOptInPrompt />
      {children}
    </NotificationsContext.Provider>
  );
}

export function useNotifications(): NotificationsContextValue {
  const context = useContext(NotificationsContext);
  if (!context) {
    throw new Error(
      "useNotifications must be used within NotificationsProvider",
    );
  }
  return context;
}

export function formatNotificationTime(iso: string, locale: string): string {
  return formatRelativeTime(iso, locale);
}
