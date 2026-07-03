import type {
  CreateUserNotificationInput,
  UserNotificationRecord,
} from "@repo/user-notifications";

import type {
  UserNotificationListCursor,
  UserNotificationListPage,
} from "./pagination.js";

export type { UserNotificationListCursor, UserNotificationListPage };
export {
  buildUserNotificationNextCursor,
  decodeUserNotificationListCursor,
  encodeUserNotificationListCursor,
} from "./pagination.js";

export interface UserNotificationRepository {
  create(
    tenantId: string,
    input: CreateUserNotificationInput,
  ): Promise<UserNotificationRecord>;
  listForUser(
    tenantId: string,
    userId: string,
    options?: {
      readonly limit?: number;
      readonly cursor?: UserNotificationListCursor | null;
      readonly unreadOnly?: boolean;
    },
  ): Promise<UserNotificationListPage>;
  countUnread(tenantId: string, userId: string): Promise<number>;
  markRead(
    tenantId: string,
    userId: string,
    id: string,
  ): Promise<UserNotificationRecord | null>;
  markAllRead(tenantId: string, userId: string): Promise<number>;
}
