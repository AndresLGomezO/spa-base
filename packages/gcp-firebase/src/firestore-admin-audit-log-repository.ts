import {
  AUDIT_LOG_COLLECTION,
  auditLogRecordSchema,
  type AuditLogRecord,
} from "@repo/debug-logs";
import type { AuditLogRepository } from "@repo/firestore-converters";
import { TENANTS_COLLECTION } from "@repo/shared-types";

import {
  getFirestoreAdmin,
  type FirebaseAdminConfig,
} from "./firebase-admin.js";

function toRecord(data: unknown): AuditLogRecord {
  return auditLogRecordSchema.parse(data);
}

export function createFirestoreAdminAuditLogRepository(
  config: FirebaseAdminConfig,
): AuditLogRepository {
  function collection(tenantId: string) {
    return getFirestoreAdmin(config)
      .collection(TENANTS_COLLECTION)
      .doc(tenantId)
      .collection(AUDIT_LOG_COLLECTION);
  }

  return {
    async listRecent(tenantId, options) {
      const limit = options?.limit ?? 50;
      const snapshot = await collection(tenantId)
        .orderBy("timestamp", "desc")
        .limit(limit)
        .get();
      return snapshot.docs.map((doc) =>
        toRecord({ id: doc.id, tenantId, ...doc.data() }),
      );
    },
  };
}
