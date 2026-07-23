import {
  createHookLogMessageInputSchema,
  HOOK_LOG_MESSAGES_COLLECTION,
  hookLogMessageRecordSchema,
  type CreateHookLogMessageInput,
  type HookLogMessageRecord,
} from "@repo/debug-logs";
import type { HookLogMessageRepository } from "@repo/firestore-converters";
import { nanoid } from "nanoid";

import {
  getFirestoreAdmin,
  type FirebaseAdminConfig,
} from "./firebase-admin.js";
import { tenantEntityCollectionRef } from "./tenant-entity-path.js";
import { applyListRecentTimeRange } from "./apply-list-recent-time-range.js";

function toRecord(data: unknown): HookLogMessageRecord {
  return hookLogMessageRecordSchema.parse(data);
}

export function createFirestoreAdminHookLogMessageRepository(
  config: FirebaseAdminConfig,
): HookLogMessageRepository {
  function collection(tenantId: string) {
    return tenantEntityCollectionRef(
      getFirestoreAdmin(config),
      tenantId,
      HOOK_LOG_MESSAGES_COLLECTION,
    );
  }

  return {
    async create(tenantId, input: CreateHookLogMessageInput) {
      const parsed = createHookLogMessageInputSchema.parse(input);
      const id = `hooklog_${nanoid(12)}`;
      const record = toRecord({
        id,
        tenantId,
        ...parsed,
      });
      await collection(tenantId).doc(id).set(record);
      return record;
    },
    async listRecent(tenantId, options) {
      const limit = options?.limit ?? 50;
      const query = applyListRecentTimeRange(
        collection(tenantId),
        "timestamp",
        options,
      );
      const snapshot = await query
        .orderBy("timestamp", "desc")
        .limit(limit)
        .get();
      return snapshot.docs.map((doc) =>
        toRecord({ id: doc.id, ...doc.data() }),
      );
    },
  };
}
