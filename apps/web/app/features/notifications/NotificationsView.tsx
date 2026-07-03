import { useCallback, useMemo } from "react";
import {
  BuilderPageShell,
  Button,
  Heading,
  PageLoader,
  SegmentedSwitch,
  Text,
} from "@repo/ui";
import { useTranslation } from "react-i18next";

import { useAuth } from "../../auth/AuthContext";
import { getEntityLabel } from "../../entities/entity-catalog";
import { useEntityCatalog } from "../../entities/entity-catalog-context";
import { NotificationListItem } from "./NotificationListItem";
import { groupNotificationsByDay } from "./notification-utils";
import { useNotifications } from "./notifications-context";
import {
  type NotificationPageFilter,
  useNotificationsPage,
} from "./use-notifications-page";

function NotificationsPageContent() {
  const { t } = useTranslation("common");
  const { unreadCount, markRead, markAllRead } = useNotifications();
  const { getDefinition, isKnownEntity } = useEntityCatalog();
  const {
    filter,
    setFilter,
    notifications,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    loadError,
  } = useNotificationsPage();

  const resolveEntityLabel = useCallback(
    (entityName: string | undefined) => {
      if (!entityName || !isKnownEntity(entityName)) {
        return undefined;
      }
      return getEntityLabel(getDefinition(entityName));
    },
    [getDefinition, isKnownEntity],
  );

  const groupedNotifications = useMemo(
    () => groupNotificationsByDay(notifications),
    [notifications],
  );

  const handleMarkAllRead = useCallback(async () => {
    await markAllRead();
  }, [markAllRead]);

  const handleMarkRead = useCallback(
    async (id: string) => {
      await markRead(id);
    },
    [markRead],
  );

  const filterOptions = useMemo(
    () =>
      [
        {
          value: "all" as const,
          label: t("notifications.filterAll"),
          ariaLabel: t("notifications.filterAll"),
        },
        {
          value: "unread" as const,
          label: t("notifications.filterUnread"),
          ariaLabel: t("notifications.filterUnread"),
        },
      ] satisfies ReadonlyArray<{
        value: NotificationPageFilter;
        label: string;
        ariaLabel: string;
      }>,
    [t],
  );

  const emptyMessage =
    filter === "unread"
      ? t("notifications.allCaughtUp")
      : t("notifications.empty");

  return (
    <BuilderPageShell
      title={t("notifications.pageTitle")}
      actions={
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={unreadCount === 0}
          onClick={() => void handleMarkAllRead()}
        >
          {t("notifications.markAllRead")}
        </Button>
      }
    >
      <div className="space-y-6">
        <SegmentedSwitch
          value={filter}
          onChange={setFilter}
          options={filterOptions}
          ariaLabel={t("notifications.filterAriaLabel")}
        />

        {loadError ? (
          <Text className="text-destructive text-sm">{loadError}</Text>
        ) : null}

        {isLoading && notifications.length === 0 ? (
          <Text className="text-muted-foreground text-sm">
            {t("notifications.loading")}
          </Text>
        ) : null}

        {!isLoading && notifications.length === 0 ? (
          <Text className="text-muted-foreground text-sm">{emptyMessage}</Text>
        ) : null}

        {groupedNotifications.map(({ group, items }) => (
          <section key={group} className="space-y-1">
            <Heading
              level={2}
              className="text-muted-foreground text-sm font-medium"
            >
              {group === "today"
                ? t("notifications.groupToday")
                : t("notifications.groupEarlier")}
            </Heading>
            <ul className="border-border divide-border divide-y overflow-hidden rounded-lg border">
              {items.map((notification) => (
                <li key={notification.id}>
                  <NotificationListItem
                    notification={notification}
                    entityLabel={resolveEntityLabel(notification.entityName)}
                    returnTo="/notifications"
                    onMarkRead={(id) => void handleMarkRead(id)}
                  />
                </li>
              ))}
            </ul>
          </section>
        ))}

        {hasNextPage ? (
          <div className="flex justify-center pt-2">
            <Button
              type="button"
              variant="outline"
              disabled={isFetchingNextPage}
              onClick={() => void fetchNextPage()}
            >
              {isFetchingNextPage
                ? t("notifications.loading")
                : t("notifications.loadMore")}
            </Button>
          </div>
        ) : null}
      </div>
    </BuilderPageShell>
  );
}

export function NotificationsView() {
  const { t } = useTranslation("common");
  const { isReady, tenantId } = useAuth();

  if (!isReady) {
    return <PageLoader ariaLabel={t("loading")} />;
  }

  if (!tenantId) {
    return (
      <div className="space-y-3">
        <Heading level={1}>{t("notifications.pageTitle")}</Heading>
        <Text>{t("tenant.selectDescription")}</Text>
      </div>
    );
  }

  return <NotificationsPageContent />;
}
