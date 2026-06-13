import {
  ENTITY_UI_OVERRIDES_COLLECTION,
  parseEntityUiOverrideRecord,
  safeFromPersistedUiOverride,
  toPersistedUiOverride,
  type PutEntityUiOverrideInput,
} from "@repo/entities";

import type { EntityUiOverrideRepository } from "@repo/firestore-converters";

import {
  getFirestoreAdmin,
  type FirebaseAdminConfig,
} from "./firebase-admin.js";
import { tenantEntityCollectionRef } from "./tenant-entity-path.js";

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
      return safeFromPersistedUiOverride(snapshot.data());
    },
    async put(tenantId, entityName, input: PutEntityUiOverrideInput) {
      const record = parseEntityUiOverrideRecord(entityName, {
        views: input.views,
        ...(input.listViewType ? { listViewType: input.listViewType } : {}),
        ...(input.listItem ? { listItem: input.listItem } : {}),
        ...(input.mainPage ? { mainPage: input.mainPage } : {}),
        ...(input.recordDetail ? { recordDetail: input.recordDetail } : {}),
        ...(input.metricWidgets !== undefined
          ? { metricWidgets: input.metricWidgets }
          : {}),
        ...(input.metricRowLayout !== undefined
          ? { metricRowLayout: input.metricRowLayout }
          : {}),
        ...(input.forms ? { forms: input.forms } : {}),
        updatedAt: new Date().toISOString(),
      });
      await collection(tenantId)
        .doc(entityName)
        .set(toPersistedUiOverride(record));
      return record;
    },
    async list(tenantId) {
      const snapshot = await collection(tenantId).get();
      return snapshot.docs.flatMap((doc) => {
        const record = safeFromPersistedUiOverride(doc.data());
        return record ? [record] : [];
      });
    },
  };
}
