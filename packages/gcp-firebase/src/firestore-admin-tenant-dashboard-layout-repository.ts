import {
  parseTenantDashboardLayoutRecord,
  safeFromPersistedTenantDashboardLayout,
  TENANT_DASHBOARD_LAYOUTS_COLLECTION,
  toPersistedTenantDashboardLayout,
  type PutTenantDashboardLayoutInput,
} from "@repo/entities";

import type { TenantDashboardLayoutRepository } from "@repo/firestore-converters";

import {
  getFirestoreAdmin,
  type FirebaseAdminConfig,
} from "./firebase-admin.js";
import { tenantEntityCollectionRef } from "./tenant-entity-path.js";

export function createFirestoreAdminTenantDashboardLayoutRepository(
  config: FirebaseAdminConfig,
): TenantDashboardLayoutRepository {
  function collection(tenantId: string) {
    return tenantEntityCollectionRef(
      getFirestoreAdmin(config),
      tenantId,
      TENANT_DASHBOARD_LAYOUTS_COLLECTION,
    );
  }

  return {
    async get(tenantId) {
      const snapshot = await collection(tenantId).doc(tenantId).get();
      if (!snapshot.exists) {
        return null;
      }
      return safeFromPersistedTenantDashboardLayout(snapshot.data());
    },
    async put(tenantId, input: PutTenantDashboardLayoutInput) {
      const record = parseTenantDashboardLayoutRecord(tenantId, input);
      await collection(tenantId)
        .doc(tenantId)
        .set(toPersistedTenantDashboardLayout(record));
      return record;
    },
  };
}
