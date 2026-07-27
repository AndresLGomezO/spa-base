import {
  DATA_HOOK_AI_CACHE_COLLECTION,
  dataHookAiCacheRecordSchema,
} from "@repo/ai-engine/schemas";
import type { DataHookAiCacheRepository } from "@repo/firestore-converters/data-hook-ai-cache";

import {
  getFirestoreAdmin,
  type FirebaseAdminConfig,
} from "./firebase-admin.js";
import { tenantEntityCollectionRef } from "./tenant-entity-path.js";

export function createFirestoreAdminDataHookAiCacheRepository(
  config: FirebaseAdminConfig,
): DataHookAiCacheRepository {
  function collection(tenantId: string) {
    return tenantEntityCollectionRef(
      getFirestoreAdmin(config),
      tenantId,
      DATA_HOOK_AI_CACHE_COLLECTION,
    );
  }

  return {
    async getById(tenantId, id) {
      const snapshot = await collection(tenantId).doc(id).get();
      if (!snapshot.exists) return null;
      return dataHookAiCacheRecordSchema.parse({
        id: snapshot.id,
        ...snapshot.data(),
      });
    },
    async upsert(record) {
      const next = dataHookAiCacheRecordSchema.parse(record);
      await collection(next.tenantId).doc(next.id).set(next);
      return next;
    },
  };
}
