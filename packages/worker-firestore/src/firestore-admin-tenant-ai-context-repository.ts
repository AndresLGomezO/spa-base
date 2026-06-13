import {
  TENANT_AI_CONTEXTS_COLLECTION,
  tenantAiContextRecordSchema,
} from "@repo/ai-context/storage";

import type { TenantAiContextRepository } from "./tenant-ai-context-repository-contract.js";
import {
  getFirestoreAdmin,
  type FirebaseAdminConfig,
} from "./firebase-admin.js";
import { tenantEntityCollectionRef } from "./tenant-entity-path.js";

export function createFirestoreAdminTenantAiContextRepository(
  config: FirebaseAdminConfig,
): TenantAiContextRepository {
  function collection(tenantId: string) {
    return tenantEntityCollectionRef(
      getFirestoreAdmin(config),
      tenantId,
      TENANT_AI_CONTEXTS_COLLECTION,
    );
  }

  return {
    async get(tenantId, id) {
      const snapshot = await collection(tenantId).doc(id).get();
      if (!snapshot.exists) {
        return null;
      }
      return tenantAiContextRecordSchema.parse({
        id: snapshot.id,
        ...snapshot.data(),
      });
    },
    async upsert(record) {
      const parsed = tenantAiContextRecordSchema.parse(record);
      await collection(parsed.tenantId).doc(parsed.id).set(parsed);
      return parsed;
    },
    async delete(tenantId, id) {
      await collection(tenantId).doc(id).delete();
    },
  };
}
