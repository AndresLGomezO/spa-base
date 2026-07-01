import {
  createRequestPerfLogInputSchema,
  REQUEST_PERF_LOGS_COLLECTION,
  requestPerfLogRecordSchema,
  type CreateRequestPerfLogInput,
  type RequestPerfLogRecord,
} from "@repo/debug-logs";
import type { RequestPerfLogRepository } from "@repo/firestore-converters";
import { nanoid } from "nanoid";

import {
  getFirestoreAdmin,
  type FirebaseAdminConfig,
} from "./firebase-admin.js";
import { tenantEntityCollectionRef } from "./tenant-entity-path.js";

function toRecord(data: unknown): RequestPerfLogRecord {
  return requestPerfLogRecordSchema.parse(data);
}

export function createFirestoreAdminRequestPerfLogRepository(
  config: FirebaseAdminConfig,
): RequestPerfLogRepository {
  function collection(tenantId: string) {
    return tenantEntityCollectionRef(
      getFirestoreAdmin(config),
      tenantId,
      REQUEST_PERF_LOGS_COLLECTION,
    );
  }

  return {
    async create(tenantId, input: CreateRequestPerfLogInput) {
      const parsed = createRequestPerfLogInputSchema.parse(input);
      const id = `perf_${nanoid(12)}`;
      const record = toRecord({
        id,
        tenantId,
        ...parsed,
      });
      await collection(tenantId).doc(id).set(record);
      return record;
    },
    async listRecent(tenantId, options) {
      const limit = options?.limit ?? 50;
      const snapshot = await collection(tenantId)
        .orderBy("timestamp", "desc")
        .limit(limit)
        .get();
      return snapshot.docs.map((doc) =>
        toRecord({ id: doc.id, ...doc.data() }),
      );
    },
  };
}
