export const NOTIFICATIONS_PREVIEW_LIMIT = 10;
export const NOTIFICATIONS_PAGE_LIMIT = 20;

export const notificationsQueryKeys = {
  preview: (tenantId: string | null | undefined) =>
    ["notifications-preview", tenantId] as const,
  page: (tenantId: string | null | undefined, filter: "all" | "unread") =>
    ["notifications-page", tenantId, filter] as const,
  unreadCount: (tenantId: string | null | undefined) =>
    ["notifications-unread-count", tenantId] as const,
};

export function invalidateNotificationQueries(
  queryClient: import("@tanstack/react-query").QueryClient,
  tenantId: string | null | undefined,
): void {
  void queryClient.invalidateQueries({
    queryKey: notificationsQueryKeys.preview(tenantId),
  });
  void queryClient.invalidateQueries({
    queryKey: notificationsQueryKeys.unreadCount(tenantId),
  });
  void queryClient.invalidateQueries({
    queryKey: ["notifications-page", tenantId],
  });
}
