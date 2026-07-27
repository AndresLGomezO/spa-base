import {
  INSIGHT_SURFACES_COLLECTION,
  createInsightSurfaceInputSchema,
  insightSurfaceRecordSchema,
  patchInsightSurfaceInputSchema,
  type CreateInsightSurfaceInput,
  type InsightSurfaceDefinition,
  type PatchInsightSurfaceInput,
} from "@repo/ai-context";
import type { InsightSurfaceRepository } from "@repo/firestore-converters";

import {
  getFirestoreAdmin,
  type FirebaseAdminConfig,
} from "./firebase-admin.js";
import { tenantEntityCollectionRef } from "./tenant-entity-path.js";

function toRecord(data: unknown): InsightSurfaceDefinition {
  return insightSurfaceRecordSchema.parse(data);
}

export function createFirestoreAdminInsightSurfaceRepository(
  config: FirebaseAdminConfig,
): InsightSurfaceRepository {
  function collection(tenantId: string) {
    return tenantEntityCollectionRef(
      getFirestoreAdmin(config),
      tenantId,
      INSIGHT_SURFACES_COLLECTION,
    );
  }

  return {
    async list(tenantId) {
      const snapshot = await collection(tenantId).get();
      return snapshot.docs
        .map((doc) => toRecord({ id: doc.id, ...doc.data() }))
        .sort(
          (a, b) => a.ui.tabOrder - b.ui.tabOrder || a.id.localeCompare(b.id),
        );
    },
    async getById(tenantId, id) {
      const snapshot = await collection(tenantId).doc(id).get();
      if (!snapshot.exists) return null;
      return toRecord({ id: snapshot.id, ...snapshot.data() });
    },
    async create(tenantId, input: CreateInsightSurfaceInput) {
      const parsed = createInsightSurfaceInputSchema.parse(input);
      const now = new Date().toISOString();
      const record = insightSurfaceRecordSchema.parse({
        ...parsed,
        tenantId,
        version: 1,
        createdAt: now,
        updatedAt: now,
      });
      await collection(tenantId).doc(record.id).set(record);
      return record;
    },
    async update(tenantId, id, input: PatchInsightSurfaceInput) {
      const current = await this.getById(tenantId, id);
      if (!current) {
        throw new Error(`Insight surface not found: ${id}`);
      }
      patchInsightSurfaceInputSchema.parse(input);
      const now = new Date().toISOString();
      const next = insightSurfaceRecordSchema.parse({
        ...current,
        ...input,
        id: current.id,
        tenantId: current.tenantId,
        version: current.version + 1,
        createdAt: current.createdAt,
        updatedAt: now,
      });
      await collection(tenantId).doc(id).set(next);
      return next;
    },
    async delete(tenantId, id) {
      await collection(tenantId).doc(id).delete();
    },
  };
}
