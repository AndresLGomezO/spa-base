import {
  AI_RECORD_SUMMARIES_COLLECTION,
  aiRecordSummaryRecordSchema,
  buildAiRecordSummaryDocId,
  type AiRecordSummaryRecord,
} from "@repo/ai-context/storage";
import type { AiRecordSummaryRepository } from "@repo/firestore-converters";

import {
  getFirestoreAdmin,
  type FirebaseAdminConfig,
} from "./firebase-admin.js";
import { tenantEntityCollectionRef } from "./tenant-entity-path.js";

export function createFirestoreAdminAiRecordSummaryRepository(
  config: FirebaseAdminConfig,
): AiRecordSummaryRepository {
  function collection(tenantId: string) {
    return tenantEntityCollectionRef(
      getFirestoreAdmin(config),
      tenantId,
      AI_RECORD_SUMMARIES_COLLECTION,
    );
  }

  return {
    async get(tenantId, entityName, recordId) {
      return this.getById(
        tenantId,
        buildAiRecordSummaryDocId(entityName, recordId),
      );
    },
    async getById(tenantId, id) {
      const snapshot = await collection(tenantId).doc(id).get();
      if (!snapshot.exists) {
        return null;
      }
      return aiRecordSummaryRecordSchema.parse({
        id: snapshot.id,
        ...snapshot.data(),
      });
    },
    async getMany(tenantId, refs) {
      if (refs.length === 0) {
        return [];
      }
      const firestore = getFirestoreAdmin(config);
      const col = collection(tenantId);
      const docs = await firestore.getAll(
        ...refs.map((ref) =>
          col.doc(buildAiRecordSummaryDocId(ref.entityName, ref.recordId)),
        ),
      );
      const items: AiRecordSummaryRecord[] = [];
      for (const snapshot of docs) {
        if (!snapshot.exists) continue;
        items.push(
          aiRecordSummaryRecordSchema.parse({
            id: snapshot.id,
            ...snapshot.data(),
          }),
        );
      }
      return items;
    },
    async upsert(record) {
      const parsed = aiRecordSummaryRecordSchema.parse(record);
      await collection(parsed.tenantId).doc(parsed.id).set(parsed);
      return parsed;
    },
    async delete(tenantId, entityName, recordId) {
      const id = buildAiRecordSummaryDocId(entityName, recordId);
      const docRef = collection(tenantId).doc(id);
      const snapshot = await docRef.get();
      if (!snapshot.exists) {
        return false;
      }
      await docRef.delete();
      return true;
    },
  };
}

export type { AiRecordSummaryRecord };
