import {
  parseTenantSidebarLayoutRecord,
  safeFromPersistedTenantSidebarLayout,
  TENANT_SIDEBAR_LAYOUTS_COLLECTION,
  toPersistedTenantSidebarLayout,
  type PutTenantSidebarLayoutInput,
} from "@repo/entities";

import type { TenantSidebarLayoutRepository } from "@repo/firestore-converters";

import {
  getFirestoreAdmin,
  type FirebaseAdminConfig,
} from "./firebase-admin.js";
import { tenantEntityCollectionRef } from "./tenant-entity-path.js";

export function createFirestoreAdminTenantSidebarLayoutRepository(
  config: FirebaseAdminConfig,
): TenantSidebarLayoutRepository {
  function collection(tenantId: string) {
    return tenantEntityCollectionRef(
      getFirestoreAdmin(config),
      tenantId,
      TENANT_SIDEBAR_LAYOUTS_COLLECTION,
    );
  }

  return {
    async get(tenantId) {
      const snapshot = await collection(tenantId).doc(tenantId).get();
      if (!snapshot.exists) {
        return null;
      }
      return safeFromPersistedTenantSidebarLayout(snapshot.data());
    },
    async put(tenantId, input: PutTenantSidebarLayoutInput) {
      const record = parseTenantSidebarLayoutRecord(tenantId, input);
      await collection(tenantId)
        .doc(tenantId)
        .set(toPersistedTenantSidebarLayout(record));
      return record;
    },
    async delete(tenantId) {
      const docRef = collection(tenantId).doc(tenantId);
      const snapshot = await docRef.get();
      if (!snapshot.exists) {
        return false;
      }
      await docRef.delete();
      return true;
    },
  };
}
