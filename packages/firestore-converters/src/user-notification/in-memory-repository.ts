import {
  createUserNotificationInputSchema,
  userNotificationRecordSchema,
  type UserNotificationRecord,
} from "@repo/user-notifications";
import { nanoid } from "nanoid";

import { buildUserNotificationNextCursor } from "./pagination.js";
import type { UserNotificationRepository } from "./repository-contract.js";

export function createInMemoryUserNotificationRepository(): UserNotificationRepository & {
  readonly store: Map<string, UserNotificationRecord>;
} {
  const store = new Map<string, UserNotificationRecord>();

  function key(tenantId: string, id: string): string {
    return `${tenantId}:${id}`;
  }

  function listMatching(
    tenantId: string,
    userId: string,
    unreadOnly: boolean,
  ): UserNotificationRecord[] {
    return [...store.values()]
      .filter(
        (record) =>
          record.tenantId === tenantId &&
          record.userId === userId &&
          (!unreadOnly || !record.read),
      )
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
  }

  return {
    store,
    async create(tenantId, input) {
      const parsed = createUserNotificationInputSchema.parse(input);
      const record = userNotificationRecordSchema.parse({
        id: `usernotif_${nanoid(12)}`,
        tenantId,
        read: parsed.read ?? false,
        ...parsed,
      });
      store.set(key(tenantId, record.id), record);
      return record;
    },
    async listForUser(tenantId, userId, options) {
      const limit = options?.limit ?? 50;
      const unreadOnly = options?.unreadOnly ?? false;
      const cursor = options?.cursor;
      let items = listMatching(tenantId, userId, unreadOnly);
      if (cursor) {
        const cursorIndex = items.findIndex(
          (item) =>
            item.id === cursor.id && item.createdAt === cursor.createdAt,
        );
        items = cursorIndex >= 0 ? items.slice(cursorIndex + 1) : items;
      }
      const pageItems = items.slice(0, limit);
      return {
        items: pageItems,
        nextCursor: buildUserNotificationNextCursor(pageItems, limit),
      };
    },
    async countUnread(tenantId, userId) {
      return listMatching(tenantId, userId, true).length;
    },
    async markRead(tenantId, userId, id) {
      const record = store.get(key(tenantId, id));
      if (!record || record.userId !== userId) {
        return null;
      }
      if (record.read) {
        return record;
      }
      const updated = userNotificationRecordSchema.parse({
        ...record,
        read: true,
        readAt: new Date().toISOString(),
      });
      store.set(key(tenantId, id), updated);
      return updated;
    },
    async markAllRead(tenantId, userId) {
      const now = new Date().toISOString();
      let count = 0;
      for (const record of store.values()) {
        if (
          record.tenantId !== tenantId ||
          record.userId !== userId ||
          record.read
        ) {
          continue;
        }
        store.set(
          key(tenantId, record.id),
          userNotificationRecordSchema.parse({
            ...record,
            read: true,
            readAt: now,
          }),
        );
        count += 1;
      }
      return count;
    },
  };
}
