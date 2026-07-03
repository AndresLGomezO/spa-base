import type { UserNotificationRecord } from "../../lib/api-client";

export function buildEntityRecordPath(
  entityName: string | undefined,
  recordId: string | undefined,
): string | null {
  if (!entityName || !recordId) {
    return null;
  }
  return `/app/${entityName}/${recordId}`;
}

export type NotificationTimeGroup = "today" | "earlier";

export interface GroupedNotifications {
  readonly group: NotificationTimeGroup;
  readonly items: readonly UserNotificationRecord[];
}

function startOfLocalDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function groupNotificationsByDay(
  notifications: readonly UserNotificationRecord[],
): readonly GroupedNotifications[] {
  const todayStart = startOfLocalDay(new Date()).getTime();
  const today: UserNotificationRecord[] = [];
  const earlier: UserNotificationRecord[] = [];

  for (const notification of notifications) {
    const createdAt = new Date(notification.createdAt).getTime();
    if (createdAt >= todayStart) {
      today.push(notification);
    } else {
      earlier.push(notification);
    }
  }

  const groups: GroupedNotifications[] = [];
  if (today.length > 0) {
    groups.push({ group: "today", items: today });
  }
  if (earlier.length > 0) {
    groups.push({ group: "earlier", items: earlier });
  }
  return groups;
}
