import {
  PUSH_TOKENS_COLLECTION,
  pushTokenRecordSchema,
  upsertPushTokenInputSchema,
  type PushTokenRecord,
  type UpsertPushTokenInput,
} from "@repo/user-notifications";
import type { PushTokenRepository } from "@repo/firestore-converters";
import { createHash } from "node:crypto";

import {
  getFirestoreAdmin,
  type FirebaseAdminConfig,
} from "./firebase-admin.js";
import { tenantEntityCollectionRef } from "./tenant-entity-path.js";

function pushTokenDocumentId(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function toRecord(data: unknown): PushTokenRecord {
  return pushTokenRecordSchema.parse(data);
}

export function createFirestoreAdminPushTokenRepository(
  config: FirebaseAdminConfig,
): PushTokenRepository {
  function collection(tenantId: string) {
    return tenantEntityCollectionRef(
      getFirestoreAdmin(config),
      tenantId,
      PUSH_TOKENS_COLLECTION,
    );
  }

  return {
    async upsert(tenantId, input: UpsertPushTokenInput) {
      const parsed = upsertPushTokenInputSchema.parse(input);
      const id = pushTokenDocumentId(parsed.token);
      const ref = collection(tenantId).doc(id);
      const existing = await ref.get();
      const now = new Date().toISOString();
      const existingRecord = existing.exists
        ? toRecord({ id: existing.id, ...existing.data() })
        : null;
      const record = toRecord({
        id,
        tenantId,
        userId: parsed.userId,
        token: parsed.token,
        ...(parsed.userAgent ? { userAgent: parsed.userAgent } : {}),
        createdAt: existingRecord?.createdAt ?? parsed.createdAt ?? now,
        updatedAt: parsed.updatedAt ?? now,
      });
      await ref.set(record);
      return record;
    },
    async deleteByToken(tenantId, userId, token) {
      const id = pushTokenDocumentId(token);
      const ref = collection(tenantId).doc(id);
      const doc = await ref.get();
      if (!doc.exists) {
        return false;
      }
      const record = toRecord({ id: doc.id, ...doc.data() });
      if (record.userId !== userId) {
        return false;
      }
      await ref.delete();
      return true;
    },
    async listForUser(tenantId, userId) {
      const snapshot = await collection(tenantId)
        .where("userId", "==", userId)
        .orderBy("updatedAt", "desc")
        .get();
      return snapshot.docs.map((doc) =>
        toRecord({ id: doc.id, ...doc.data() }),
      );
    },
  };
}
