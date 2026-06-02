import {
  ENTITY_UI_OVERRIDES_COLLECTION,
  entityUiOverrideRecordSchema,
  type EntityUiOverrideRecord,
  type PutEntityUiOverrideInput,
} from "@repo/entities";

import type { EntityUiOverrideRepository } from "@repo/firestore-converters";

import {
  getFirestoreAdmin,
  type FirebaseAdminConfig,
} from "./firebase-admin.js";
import { tenantEntityCollectionRef } from "./tenant-entity-path.js";

function toRecord(entityName: string, data: unknown): EntityUiOverrideRecord {
  return entityUiOverrideRecordSchema.parse({
    entityName,
    ...(typeof data === "object" && data !== null ? data : {}),
  }) as EntityUiOverrideRecord;
}

export function createFirestoreAdminEntityUiOverrideRepository(
  config: FirebaseAdminConfig,
): EntityUiOverrideRepository {
  function collection(tenantId: string) {
    return tenantEntityCollectionRef(
      getFirestoreAdmin(config),
      tenantId,
      ENTITY_UI_OVERRIDES_COLLECTION,
    );
  }

  return {
    async get(tenantId, entityName) {
      const snapshot = await collection(tenantId).doc(entityName).get();
      if (!snapshot.exists) {
        return null;
      }
      return toRecord(entityName, snapshot.data()) as EntityUiOverrideRecord;
    },
    async put(tenantId, entityName, input: PutEntityUiOverrideInput) {
      const record = entityUiOverrideRecordSchema.parse({
        entityName,
        views: input.views,
        ...(input.listViewType ? { listViewType: input.listViewType } : {}),
        updatedAt: new Date().toISOString(),
      }) as EntityUiOverrideRecord;
      await collection(tenantId).doc(entityName).set(record);
      return record;
    },
    async list(tenantId) {
      const snapshot = await collection(tenantId).get();
      return snapshot.docs.map((doc) => toRecord(doc.id, doc.data()));
    },
  };
}
