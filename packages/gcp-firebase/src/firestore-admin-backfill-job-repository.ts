import { BACKFILL_JOBS_COLLECTION } from "@repo/metrics-engine";
import { nanoid } from "nanoid";

import {
  backfillJobRecordSchema,
  type BackfillJobRepository,
} from "@repo/firestore-converters";

import {
  getFirestoreAdmin,
  type FirebaseAdminConfig,
} from "./firebase-admin.js";
import { tenantEntityCollectionRef } from "./tenant-entity-path.js";

export function createFirestoreAdminBackfillJobRepository(
  config: FirebaseAdminConfig,
): BackfillJobRepository {
  function collection(tenantId: string) {
    return tenantEntityCollectionRef(
      getFirestoreAdmin(config),
      tenantId,
      BACKFILL_JOBS_COLLECTION,
    );
  }

  return {
    async create(tenantId, input) {
      const now = new Date().toISOString();
      const id = `backfill_${nanoid(12)}`;
      const record = backfillJobRecordSchema.parse({
        id,
        tenantId,
        metricDefinitionId: input.metricDefinitionId,
        sourceModel: input.sourceModel,
        status: "PENDING",
        processedEvents: 0,
        totalEvents: null,
        errorMessage: null,
        createdAt: now,
        updatedAt: now,
      });
      await collection(tenantId).doc(id).set(record);
      return record;
    },
    async getById(tenantId, id) {
      const snapshot = await collection(tenantId).doc(id).get();
      if (!snapshot.exists) return null;
      return backfillJobRecordSchema.parse({
        id: snapshot.id,
        ...snapshot.data(),
      });
    },
    async update(tenantId, id, patch) {
      const current = await this.getById(tenantId, id);
      if (!current) {
        throw new Error(`Backfill job not found: ${id}`);
      }

      const next = backfillJobRecordSchema.parse({
        ...current,
        ...patch,
        updatedAt: new Date().toISOString(),
      });
      await collection(tenantId).doc(id).set(next);
      return next;
    },
    async hasCompletedBackfillForMetric(tenantId, metricDefinitionId) {
      const snapshot = await collection(tenantId)
        .where("metricDefinitionId", "==", metricDefinitionId)
        .where("status", "==", "COMPLETED")
        .limit(1)
        .get();
      return !snapshot.empty;
    },
  };
}
