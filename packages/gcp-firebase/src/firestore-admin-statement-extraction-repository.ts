import {
  STATEMENT_EXTRACTIONS_COLLECTION,
  statementExtractionRecordSchema,
  type StatementExtractionListOptions,
  type StatementExtractionPatch,
  type StatementExtractionRecord,
} from "@repo/ai-context/storage";
import type { StatementExtractionRepository } from "@repo/firestore-converters";

import {
  getFirestoreAdmin,
  type FirebaseAdminConfig,
} from "./firebase-admin.js";
import { tenantEntityCollectionRef } from "./tenant-entity-path.js";

export function createFirestoreAdminStatementExtractionRepository(
  config: FirebaseAdminConfig,
): StatementExtractionRepository {
  function collection(tenantId: string) {
    return tenantEntityCollectionRef(
      getFirestoreAdmin(config),
      tenantId,
      STATEMENT_EXTRACTIONS_COLLECTION,
    );
  }

  return {
    async get(tenantId, id) {
      const snapshot = await collection(tenantId).doc(id).get();
      if (!snapshot.exists) {
        return null;
      }
      return statementExtractionRecordSchema.parse({
        id: snapshot.id,
        ...snapshot.data(),
      });
    },
    async list(tenantId, options?: StatementExtractionListOptions) {
      const limit = Math.min(Math.max(options?.limit ?? 50, 1), 1000);
      let query = collection(tenantId).orderBy("updatedAt", "desc");
      if (options?.status) {
        query = collection(tenantId)
          .where("status", "==", options.status)
          .orderBy("updatedAt", "desc");
      }
      const snapshot = await query.limit(limit).get();
      return snapshot.docs.map((doc) =>
        statementExtractionRecordSchema.parse({
          id: doc.id,
          ...doc.data(),
        }),
      );
    },
    async create(record) {
      const parsed = statementExtractionRecordSchema.parse(record);
      await collection(parsed.tenantId).doc(parsed.id).set(parsed);
      return parsed;
    },
    async update(tenantId, id, patch: StatementExtractionPatch) {
      const existing = await this.get(tenantId, id);
      if (!existing) {
        throw new Error(`Statement extraction not found: ${id}`);
      }
      const updated = statementExtractionRecordSchema.parse({
        ...existing,
        ...patch,
        id: existing.id,
        tenantId: existing.tenantId,
        createdAt: existing.createdAt,
        updatedAt: new Date().toISOString(),
      });
      await collection(tenantId).doc(id).set(updated);
      return updated;
    },
  };
}

export type { StatementExtractionRecord };
