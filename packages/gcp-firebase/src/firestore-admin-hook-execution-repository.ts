import {
  createDataHookExecutionInputSchema,
  DATA_HOOK_EXECUTIONS_COLLECTION,
  dataHookExecutionRecordSchema,
  type CreateDataHookExecutionInput,
  type DataHookExecutionRecord,
} from "@repo/hooks";
import type { DataHookExecutionRepository } from "@repo/firestore-converters";
import { nanoid } from "nanoid";

import {
  getFirestoreAdmin,
  type FirebaseAdminConfig,
} from "./firebase-admin.js";
import { tenantEntityCollectionRef } from "./tenant-entity-path.js";

function toRecord(data: unknown) {
  return dataHookExecutionRecordSchema.parse(data);
}

export function sortExecutionsByStartedAtDesc(
  records: readonly DataHookExecutionRecord[],
): DataHookExecutionRecord[] {
  return [...records].sort((left, right) =>
    right.startedAt.localeCompare(left.startedAt),
  );
}

export function createFirestoreAdminDataHookExecutionRepository(
  config: FirebaseAdminConfig,
): DataHookExecutionRepository {
  function collection(tenantId: string) {
    return tenantEntityCollectionRef(
      getFirestoreAdmin(config),
      tenantId,
      DATA_HOOK_EXECUTIONS_COLLECTION,
    );
  }

  return {
    async create(tenantId, input: CreateDataHookExecutionInput) {
      const parsed = createDataHookExecutionInputSchema.parse(input);
      const id = `hookexec_${nanoid(12)}`;
      const record = toRecord({
        id,
        tenantId,
        ...parsed,
      });
      await collection(tenantId).doc(id).set(record);
      return record;
    },
    async listByHookId(tenantId, hookId, options) {
      const limit = options?.limit ?? 50;
      // Equality filter only — sort in memory to avoid a composite index on
      // hookId + startedAt (single-field indexes are auto-provisioned).
      const snapshot = await collection(tenantId)
        .where("hookId", "==", hookId)
        .get();
      return sortExecutionsByStartedAtDesc(
        snapshot.docs.map((doc) => toRecord({ id: doc.id, ...doc.data() })),
      ).slice(0, limit);
    },
    async listRecent(tenantId, options) {
      const limit = options?.limit ?? 50;
      const snapshot = await collection(tenantId)
        .orderBy("startedAt", "desc")
        .limit(limit)
        .get();
      return snapshot.docs.map((doc) =>
        toRecord({ id: doc.id, ...doc.data() }),
      );
    },
  };
}
