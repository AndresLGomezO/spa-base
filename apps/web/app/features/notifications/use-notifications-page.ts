import { useCallback, useMemo, useState } from "react";
import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";

import { useAuth } from "../../auth/AuthContext";
import { listNotifications } from "../../lib/api-client";
import {
  invalidateNotificationQueries,
  NOTIFICATIONS_PAGE_LIMIT,
  notificationsQueryKeys,
} from "./notifications-query-keys";

export type NotificationPageFilter = "all" | "unread";

export function useNotificationsPage() {
  const { isReady, tenantId } = useAuth();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<NotificationPageFilter>("all");

  const notificationsQuery = useInfiniteQuery({
    queryKey: notificationsQueryKeys.page(tenantId, filter),
    queryFn: ({ pageParam }) =>
      listNotifications({
        limit: NOTIFICATIONS_PAGE_LIMIT,
        unreadOnly: filter === "unread",
        ...(pageParam ? { cursor: pageParam } : {}),
      }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    enabled: isReady && Boolean(tenantId),
  });

  const notifications = useMemo(
    () => notificationsQuery.data?.pages.flatMap((page) => page.items) ?? [],
    [notificationsQuery.data?.pages],
  );

  const invalidateAll = useCallback(() => {
    invalidateNotificationQueries(queryClient, tenantId);
  }, [queryClient, tenantId]);

  return {
    filter,
    setFilter,
    notifications,
    isLoading: notificationsQuery.isLoading,
    isFetchingNextPage: notificationsQuery.isFetchingNextPage,
    hasNextPage: notificationsQuery.hasNextPage,
    fetchNextPage: notificationsQuery.fetchNextPage,
    invalidateAll,
    loadError: notificationsQuery.error
      ? notificationsQuery.error instanceof Error
        ? notificationsQuery.error.message
        : String(notificationsQuery.error)
      : null,
  };
}
