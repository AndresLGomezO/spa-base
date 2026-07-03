import type { UserNotificationRecord } from "@repo/user-notifications";

export interface UserNotificationListCursor {
  readonly createdAt: string;
  readonly id: string;
}

export interface UserNotificationListPage {
  readonly items: readonly UserNotificationRecord[];
  readonly nextCursor: UserNotificationListCursor | null;
}

export function encodeUserNotificationListCursor(
  cursor: UserNotificationListCursor,
): string {
  return Buffer.from(JSON.stringify(cursor), "utf8").toString("base64url");
}

export function decodeUserNotificationListCursor(
  raw: string | null | undefined,
): UserNotificationListCursor | null {
  if (!raw?.trim()) {
    return null;
  }

  try {
    const parsed = JSON.parse(
      Buffer.from(raw, "base64url").toString("utf8"),
    ) as UserNotificationListCursor;
    if (
      typeof parsed.createdAt === "string" &&
      parsed.createdAt.trim().length > 0 &&
      typeof parsed.id === "string" &&
      parsed.id.trim().length > 0
    ) {
      return {
        createdAt: parsed.createdAt,
        id: parsed.id,
      };
    }
    return null;
  } catch {
    return null;
  }
}

export function buildUserNotificationNextCursor(
  items: readonly UserNotificationRecord[],
  limit: number,
): UserNotificationListCursor | null {
  if (items.length < limit) {
    return null;
  }

  const last = items[items.length - 1];
  if (!last) {
    return null;
  }

  return {
    createdAt: last.createdAt,
    id: last.id,
  };
}
