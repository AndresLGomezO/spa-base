import {
  createUserNotificationInputSchema,
  USER_NOTIFICATIONS_COLLECTION,
  userNotificationRecordSchema,
  type CreateUserNotificationInput,
  type UserNotificationRecord,
} from "@repo/user-notifications";
import type { UserNotificationRepository } from "@repo/firestore-converters";
import {
  buildUserNotificationNextCursor,
  type UserNotificationListCursor,
} from "@repo/firestore-converters";
import { nanoid } from "nanoid";

import {
  getFirestoreAdmin,
  type FirebaseAdminConfig,
} from "./firebase-admin.js";
import { tenantEntityCollectionRef } from "./tenant-entity-path.js";

function toRecord(data: unknown): UserNotificationRecord {
  return userNotificationRecordSchema.parse(data);
}

function applyCursorToQuery<
  T extends { startAfter: (...values: unknown[]) => T },
>(query: T, cursor: UserNotificationListCursor | null | undefined): T {
  if (!cursor) {
    return query;
  }
  return query.startAfter(cursor.createdAt, cursor.id);
}

export function createFirestoreAdminUserNotificationRepository(
  config: FirebaseAdminConfig,
): UserNotificationRepository {
  function collection(tenantId: string) {
    return tenantEntityCollectionRef(
      getFirestoreAdmin(config),
      tenantId,
      USER_NOTIFICATIONS_COLLECTION,
    );
  }

  return {
    async create(tenantId, input: CreateUserNotificationInput) {
      const parsed = createUserNotificationInputSchema.parse(input);
      const id = `usernotif_${nanoid(12)}`;
      const record = toRecord({
        id,
        tenantId,
        read: parsed.read ?? false,
        ...parsed,
      });
      await collection(tenantId).doc(id).set(record);
      return record;
    },
    async listForUser(tenantId, userId, options) {
      const limit = options?.limit ?? 50;
      const unreadOnly = options?.unreadOnly ?? false;
      let query = unreadOnly
        ? collection(tenantId)
            .where("userId", "==", userId)
            .where("read", "==", false)
            .orderBy("createdAt", "desc")
            .orderBy("id", "desc")
        : collection(tenantId)
            .where("userId", "==", userId)
            .orderBy("createdAt", "desc")
            .orderBy("id", "desc");
      query = applyCursorToQuery(query, options?.cursor).limit(limit);
      const snapshot = await query.get();
      const items = snapshot.docs.map((doc) =>
        toRecord({ id: doc.id, ...doc.data() }),
      );
      return {
        items,
        nextCursor: buildUserNotificationNextCursor(items, limit),
      };
    },
    async countUnread(tenantId, userId) {
      const snapshot = await collection(tenantId)
        .where("userId", "==", userId)
        .where("read", "==", false)
        .count()
        .get();
      return snapshot.data().count;
    },
    async markRead(tenantId, userId, id) {
      const ref = collection(tenantId).doc(id);
      const doc = await ref.get();
      if (!doc.exists) {
        return null;
      }
      const record = toRecord({ id: doc.id, ...doc.data() });
      if (record.userId !== userId) {
        return null;
      }
      if (record.read) {
        return record;
      }
      const updated = toRecord({
        ...record,
        read: true,
        readAt: new Date().toISOString(),
      });
      await ref.set(updated);
      return updated;
    },
    async markAllRead(tenantId, userId) {
      const snapshot = await collection(tenantId)
        .where("userId", "==", userId)
        .where("read", "==", false)
        .get();
      if (snapshot.empty) {
        return 0;
      }
      const now = new Date().toISOString();
      const batch = getFirestoreAdmin(config).batch();
      for (const doc of snapshot.docs) {
        batch.set(
          doc.ref,
          toRecord({
            ...toRecord({ id: doc.id, ...doc.data() }),
            read: true,
            readAt: now,
          }),
        );
      }
      await batch.commit();
      return snapshot.size;
    },
  };
}
