import {
  useState,
  type ComponentPropsWithoutRef,
} from "react";
import { useTranslation } from "react-i18next";
import { Link, useLocation } from "react-router";

import type { MetricKpiPresentation } from "@repo/ui-builder-core";
import {
  interactiveNotificationBellIconClass,
  interactiveTriggerBaseClass,
} from "@repo/ui-builder-core";
import {
  Button,
  Popover,
  Text,
  sidebarMenuButtonClassName,
  type PopoverPlacement,
} from "@repo/ui";
import { cn } from "@repo/theme/utils";

import { resolveLucideIcon } from "../../lib/resolve-lucide-icon";
import { buildCurrentReturnTo } from "../../routing/entity-navigation";
import { resolveLucideIconBoxStyle } from "../../components/entity/LayoutLucideIcon";
import { NotificationListItem } from "./NotificationListItem";
import { useNotifications } from "./notifications-context";

export interface NotificationsMenuTriggerProps
  extends Omit<
    ComponentPropsWithoutRef<typeof Button>,
    "children" | "fullWidth" | "variant" | "type"
  > {
  readonly iconName: string;
  readonly iconSize?: number;
  readonly presentation?: Pick<
    MetricKpiPresentation,
    "textSize" | "cssText" | "valueClassName" | "valueStyle"
  >;
  readonly unreadCount: number;
  readonly showBadge?: boolean;
  readonly showLabel?: boolean;
  readonly open?: boolean;
  readonly fullWidth?: boolean;
  readonly useSidebarButtonStyle?: boolean;
  readonly customChrome?: boolean;
}

export function NotificationsMenuTrigger({
  iconName,
  iconSize,
  presentation,
  unreadCount,
  showBadge = true,
  showLabel = false,
  open = false,
  fullWidth = false,
  useSidebarButtonStyle = false,
  customChrome = false,
  className,
  onClick,
  ...buttonProps
}: NotificationsMenuTriggerProps) {
  const { t } = useTranslation("common");
  const Icon = resolveLucideIcon(iconName);
  const iconBoxStyle = resolveLucideIconBoxStyle(
    { iconSize },
    {
      textSize: presentation?.textSize,
      cssText: presentation?.cssText,
    },
  );
  const badgeLabel =
    unreadCount > 99 ? "99+" : unreadCount > 0 ? String(unreadCount) : null;
  const useLayoutIconStates = !customChrome && !useSidebarButtonStyle;

  return (
    <Button
      type="button"
      variant="ghost"
      fullWidth={fullWidth}
      aria-label={t("notifications.bellAriaLabel", { count: unreadCount })}
      {...buttonProps}
      onClick={(event) => {
        event.stopPropagation();
        onClick?.(event);
      }}
      className={cn(
        "relative font-normal focus-visible:ring-offset-0",
        interactiveTriggerBaseClass(customChrome),
        useLayoutIconStates && "group",
        useSidebarButtonStyle
          ? sidebarMenuButtonClassName({ size: "default" })
          : "inline-flex h-auto items-center justify-center p-2",
        fullWidth ? "w-full justify-start" : "w-fit max-w-full",
        open &&
          useSidebarButtonStyle &&
          "bg-sidebar-accent text-sidebar-accent-foreground",
        className,
        presentation?.valueClassName,
      )}
      style={presentation?.valueStyle}
    >
      <Icon
        aria-hidden
        style={iconBoxStyle}
        className={cn(
          "inline-block shrink-0",
          useLayoutIconStates && interactiveNotificationBellIconClass(open),
        )}
      />
      {showLabel ? (
        <span className="group-data-[collapsible=icon]/sidebar:hidden">
          {t("notifications.bellLabel")}
        </span>
      ) : null}
      {showBadge && badgeLabel ? (
        <span
          className={cn(
            "bg-primary text-primary-foreground absolute flex min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-semibold",
            showLabel
              ? "top-1.5 left-6 group-data-[collapsible=icon]/sidebar:left-5"
              : "top-0.5 right-0.5",
          )}
        >
          {badgeLabel}
        </span>
      ) : null}
    </Button>
  );
}

export function NotificationsMenuContent({
  onClose,
}: {
  readonly onClose: () => void;
}) {
  const { t } = useTranslation("common");
  const location = useLocation();
  const returnTo = buildCurrentReturnTo(location);
  const {
    notifications,
    unreadCount,
    markRead,
    markAllRead,
    isLoading,
  } = useNotifications();

  return (
    <>
      <div className="border-border flex items-center justify-between gap-2 border-b px-4 py-3">
        <Text className="font-medium">{t("notifications.panelTitle")}</Text>
        <div className="flex shrink-0 items-center gap-1">
          <Link
            to="/notifications"
            className="text-primary hover:bg-muted inline-flex h-8 items-center rounded-md px-2.5 text-sm font-medium transition-colors"
            onClick={onClose}
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
                onNavigate={onClose}
              />
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}

export interface NotificationsMenuProps {
  readonly placement?: PopoverPlacement;
  readonly fullWidth?: boolean;
  readonly iconName?: string;
  readonly iconSize?: number;
  readonly showBadge?: boolean;
  readonly showLabel?: boolean;
  readonly useSidebarButtonStyle?: boolean;
  readonly open?: boolean;
  readonly onOpenChange?: (open: boolean) => void;
  readonly presentation?: Pick<
    MetricKpiPresentation,
    "textSize" | "cssText" | "valueClassName" | "valueStyle"
  >;
  readonly customChrome?: boolean;
  readonly className?: string;
  readonly triggerClassName?: string;
}

export function NotificationsMenu({
  placement = "right-start",
  fullWidth = false,
  iconName = "Bell",
  iconSize,
  showBadge = true,
  showLabel = false,
  useSidebarButtonStyle = false,
  open: controlledOpen,
  onOpenChange,
  presentation,
  customChrome = false,
  className,
  triggerClassName,
}: NotificationsMenuProps) {
  const { unreadCount } = useNotifications();
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const open = controlledOpen ?? uncontrolledOpen;
  const setOpen = onOpenChange ?? setUncontrolledOpen;

  return (
    <Popover
      open={open}
      onOpenChange={setOpen}
      placement={placement}
      panelClassName="w-96 max-w-[calc(100vw-2rem)] p-0"
      className={cn(
        fullWidth ? "block w-full" : "block w-fit max-w-full",
        className,
      )}
      trigger={
        <NotificationsMenuTrigger
          iconName={iconName}
          iconSize={iconSize}
          presentation={presentation}
          unreadCount={unreadCount}
          showBadge={showBadge}
          showLabel={showLabel}
          open={open}
          fullWidth={fullWidth}
          useSidebarButtonStyle={useSidebarButtonStyle}
          customChrome={customChrome}
          className={triggerClassName}
        />
      }
    >
      <NotificationsMenuContent onClose={() => setOpen(false)} />
    </Popover>
  );
}
