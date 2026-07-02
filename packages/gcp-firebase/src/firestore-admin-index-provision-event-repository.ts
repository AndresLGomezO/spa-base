import {
  createIndexProvisionEventInputSchema,
  INDEX_PROVISION_EVENTS_COLLECTION,
  indexProvisionEventRecordSchema,
  type CreateIndexProvisionEventInput,
  type IndexProvisionEventRecord,
} from "@repo/debug-logs";
import type { IndexProvisionEventRepository } from "@repo/firestore-converters";
import { nanoid } from "nanoid";

import {
  getFirestoreAdmin,
  type FirebaseAdminConfig,
} from "./firebase-admin.js";
import { tenantEntityCollectionRef } from "./tenant-entity-path.js";

function toRecord(data: unknown): IndexProvisionEventRecord {
  return indexProvisionEventRecordSchema.parse(data);
}

export function createFirestoreAdminIndexProvisionEventRepository(
  config: FirebaseAdminConfig,
): IndexProvisionEventRepository {
  function collection(tenantId: string) {
    return tenantEntityCollectionRef(
      getFirestoreAdmin(config),
      tenantId,
      INDEX_PROVISION_EVENTS_COLLECTION,
    );
  }

  return {
    async create(tenantId, input: CreateIndexProvisionEventInput) {
      const parsed = createIndexProvisionEventInputSchema.parse(input);
      const id = `idxevt_${nanoid(12)}`;
      const resolvedTenantId = tenantId ?? parsed.tenantId ?? "__platform__";
      const record = toRecord({
        id,
        ...parsed,
        ...(tenantId ? { tenantId } : {}),
      });
      await collection(resolvedTenantId).doc(id).set(record);
      return record;
    },
    async listRecentForTenant(tenantId, tenantCollections, options) {
      const limit = options?.limit ?? 50;
      const collectionSet = new Set(tenantCollections);
      const snapshot = await collection(tenantId)
        .orderBy("timestamp", "desc")
        .limit(limit * 3)
        .get();

      return snapshot.docs
        .map((doc) => toRecord({ id: doc.id, ...doc.data() }))
        .filter((record) => {
          if (record.tenantId === tenantId) {
            return true;
          }
          if (!record.tenantId && collectionSet.has(record.collection)) {
            return true;
          }
          return (
            record.tenantId === undefined &&
            collectionSet.has(record.collection)
          );
        })
        .slice(0, limit);
    },
  };
}
