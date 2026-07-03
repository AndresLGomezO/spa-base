import { AlertCircle, Bell } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";

import { Text } from "@repo/ui";
import { cn } from "@repo/theme/utils";

import type { UserNotificationRecord } from "../../lib/api-client";
import {
  isSafeAppReturnTo,
  type EntityReturnToState,
} from "../../routing/entity-navigation";
import { formatNotificationTime } from "./notifications-context";
import { buildEntityRecordPath } from "./notification-utils";

interface NotificationListItemProps {
  readonly notification: UserNotificationRecord;
  readonly compact?: boolean;
  readonly entityLabel?: string;
  readonly returnTo?: string;
  readonly onMarkRead?: (id: string) => void;
  readonly onNavigate?: () => void;
}

export function NotificationListItem({
  notification,
  compact = false,
  entityLabel,
  returnTo,
  onMarkRead,
  onNavigate,
}: NotificationListItemProps) {
  const { t, i18n } = useTranslation("common");
  const recordPath = buildEntityRecordPath(
    notification.entityName,
    notification.recordId,
  );
  const linkState: EntityReturnToState | undefined =
    returnTo && isSafeAppReturnTo(returnTo) ? { returnTo } : undefined;
  const Icon = notification.level === "error" ? AlertCircle : Bell;

  const metadataParts: string[] = [];
  if (notification.hookName) {
    metadataParts.push(
      t("notifications.fromHook", { hook: notification.hookName }),
    );
  }
  if (entityLabel) {
    metadataParts.push(t("notifications.onEntity", { entity: entityLabel }));
  }
  metadataParts.push(
    formatNotificationTime(notification.createdAt, i18n.language),
  );

  const handleActivate = () => {
    if (!notification.read) {
      onMarkRead?.(notification.id);
    }
    onNavigate?.();
  };

  const content = (
    <>
      {!compact ? (
        <div
          className={cn(
            "flex size-10 shrink-0 items-center justify-center rounded-full",
            notification.level === "error"
              ? "bg-destructive/10 text-destructive"
              : "bg-primary/10 text-primary",
          )}
        >
          <Icon className="size-4" aria-hidden />
        </div>
      ) : null}
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-3">
          <Text
            className={cn(
              compact ? "text-sm" : "text-base",
              !notification.read && "font-semibold",
            )}
          >
            {notification.message}
          </Text>
          {!notification.read ? (
            <span
              className="bg-primary mt-1.5 size-2.5 shrink-0 rounded-full"
              aria-hidden
            />
          ) : null}
        </div>
        <Text
          variant="caption"
          className="text-muted-foreground mt-1 block truncate"
        >
          {metadataParts.join(" · ")}
        </Text>
        {recordPath && !compact ? (
          <Link
            to={recordPath}
            state={linkState}
            className="text-primary mt-2 inline-block text-sm font-medium hover:underline"
            onClick={(event) => {
              event.stopPropagation();
              onNavigate?.();
            }}
          >
            {t("notifications.viewRecord")}
          </Link>
        ) : null}
      </div>
    </>
  );

  if (recordPath) {
    return (
      <Link
        to={recordPath}
        state={linkState}
        className={cn(
          "hover:bg-muted/50 flex w-full transition-colors",
          compact ? "gap-0 px-4 py-3" : "gap-3 px-4 py-4",
          !notification.read && "bg-muted/20",
        )}
        onClick={() => {
          handleActivate();
        }}
      >
        {content}
      </Link>
    );
  }

  return (
    <button
      type="button"
      className={cn(
        "hover:bg-muted/50 flex w-full text-left transition-colors",
        compact ? "gap-0 px-4 py-3" : "gap-3 px-4 py-4",
        !notification.read && "bg-muted/20",
      )}
      onClick={handleActivate}
    >
      {content}
    </button>
  );
}
