import {
  USER_AI_MEMORIES_COLLECTION,
  userAiMemoryRecordSchema,
  type UserAiMemoryRecord,
} from "@repo/ai-context/storage";

import type { UserAiMemoryRepository } from "@repo/firestore-converters";

import {
  getFirestoreAdmin,
  type FirebaseAdminConfig,
} from "./firebase-admin.js";
import { tenantEntityCollectionRef } from "./tenant-entity-path.js";

export function createFirestoreAdminUserAiMemoryRepository(
  config: FirebaseAdminConfig,
): UserAiMemoryRepository {
  function collection(tenantId: string) {
    return tenantEntityCollectionRef(
      getFirestoreAdmin(config),
      tenantId,
      USER_AI_MEMORIES_COLLECTION,
    );
  }

  return {
    async get(tenantId, userId) {
      const snapshot = await collection(tenantId).doc(userId).get();
      if (!snapshot.exists) {
        return null;
      }
      return userAiMemoryRecordSchema.parse({
        id: snapshot.id,
        ...snapshot.data(),
      });
    },
    async upsert(record) {
      const parsed = userAiMemoryRecordSchema.parse(record);
      await collection(parsed.tenantId).doc(parsed.userId).set(parsed);
      return parsed;
    },
    async delete(tenantId, userId) {
      await collection(tenantId).doc(userId).delete();
    },
    async listUpdatedSince(tenantId, sinceIso) {
      const snapshot = await collection(tenantId)
        .where("updatedAt", ">=", sinceIso)
        .get();
      return snapshot.docs.map((doc) =>
        userAiMemoryRecordSchema.parse({
          id: doc.id,
          ...doc.data(),
        }),
      );
    },
    async clearVertexCachesForTenant(tenantId) {
      const snapshot = await collection(tenantId).get();
      if (snapshot.empty) {
        return 0;
      }
      const now = new Date().toISOString();
      let count = 0;
      const batchSize = 400;
      let batch = getFirestoreAdmin(config).batch();
      let ops = 0;
      for (const doc of snapshot.docs) {
        const data = doc.data();
        if (!data.vertexCacheName && !data.vertexCacheExpireAt) {
          continue;
        }
        batch.update(doc.ref, {
          vertexCacheName: null,
          vertexCacheExpireAt: null,
          updatedAt: now,
        });
        count += 1;
        ops += 1;
        if (ops >= batchSize) {
          await batch.commit();
          batch = getFirestoreAdmin(config).batch();
          ops = 0;
        }
      }
      if (ops > 0) {
        await batch.commit();
      }
      return count;
    },
  };
}

export type { UserAiMemoryRecord };
