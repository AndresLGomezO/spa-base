import { Bell } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link, useLocation } from "react-router";

import { Button, Popover, Text, sidebarMenuButtonClassName } from "@repo/ui";
import { cn } from "@repo/theme/utils";

import { buildCurrentReturnTo } from "../../routing/entity-navigation";
import { NotificationListItem } from "./NotificationListItem";
import { useNotifications } from "./notifications-context";

export function NotificationBell() {
  const { t } = useTranslation("common");
  const location = useLocation();
  const returnTo = buildCurrentReturnTo(location);
  const {
    notifications,
    unreadCount,
    isPanelOpen,
    setPanelOpen,
    markRead,
    markAllRead,
    isLoading,
  } = useNotifications();

  const badgeLabel =
    unreadCount > 99 ? "99+" : unreadCount > 0 ? String(unreadCount) : null;

  return (
    <Popover
      open={isPanelOpen}
      onOpenChange={setPanelOpen}
      placement="right-start"
      panelClassName="w-96 max-w-[calc(100vw-2rem)] p-0"
      className="block w-full"
      trigger={
        <Button
          type="button"
          variant="ghost"
          fullWidth
          aria-label={t("notifications.bellAriaLabel", { count: unreadCount })}
          className={cn(
            sidebarMenuButtonClassName({ size: "default" }),
            "relative h-auto justify-start border-0 font-normal shadow-none focus-visible:ring-offset-0",
            isPanelOpen && "bg-sidebar-accent text-sidebar-accent-foreground",
          )}
        >
          <Bell className="size-4 shrink-0" aria-hidden />
          <span className="group-data-[collapsible=icon]/sidebar:hidden">
            {t("notifications.bellLabel")}
          </span>
          {badgeLabel ? (
            <span className="bg-primary text-primary-foreground absolute top-1.5 left-6 flex min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-semibold group-data-[collapsible=icon]/sidebar:left-5">
              {badgeLabel}
            </span>
          ) : null}
        </Button>
      }
    >
      <div className="border-border flex items-center justify-between gap-2 border-b px-4 py-3">
        <Text className="font-medium">{t("notifications.panelTitle")}</Text>
        <div className="flex shrink-0 items-center gap-1">
          <Link
            to="/notifications"
            className="text-primary hover:bg-muted inline-flex h-8 items-center rounded-md px-2.5 text-sm font-medium transition-colors"
            onClick={() => setPanelOpen(false)}
          >
            {t("notifications.viewAll")}
          </Link>
          {unreadCount > 0 ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => void markAllRead()}
            >
              {t("notifications.markAllRead")}
            </Button>
          ) : null}
        </div>
      </div>
      <div className="max-h-96 overflow-y-auto">
        {isLoading && notifications.length === 0 ? (
          <Text className="text-muted-foreground block px-4 py-6 text-sm">
            {t("notifications.loading")}
          </Text>
        ) : null}
        {!isLoading && notifications.length === 0 ? (
          <Text className="text-muted-foreground block px-4 py-6 text-sm">
            {t("notifications.empty")}
          </Text>
        ) : null}
        <ul className="divide-border divide-y">
          {notifications.map((notification) => (
            <li key={notification.id}>
              <NotificationListItem
                notification={notification}
                compact
                returnTo={returnTo}
                onMarkRead={(id) => void markRead(id)}
                onNavigate={() => setPanelOpen(false)}
              />
            </li>
          ))}
        </ul>
      </div>
    </Popover>
  );
}
