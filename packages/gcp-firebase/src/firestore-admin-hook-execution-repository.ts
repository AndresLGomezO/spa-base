import {
  createDataHookExecutionInputSchema,
  DATA_HOOK_EXECUTIONS_COLLECTION,
  dataHookExecutionRecordSchema,
  type CreateDataHookExecutionInput,
  type DataHookExecutionRecord,
  type UpdateDataHookExecutionPatch,
} from "@repo/hooks";
import type { DataHookExecutionRepository } from "@repo/firestore-converters";
import { summarizeActiveExecutions } from "@repo/firestore-converters";
import {
  buildHookExecutionNextCursor,
  type HookExecutionListCursor,
} from "@repo/firestore-converters";
import { nanoid } from "nanoid";

import {
  getFirestoreAdmin,
  type FirebaseAdminConfig,
} from "./firebase-admin.js";
import { applyListRecentTimeRange } from "./apply-list-recent-time-range.js";
import { tenantEntityCollectionRef } from "./tenant-entity-path.js";

function toRecord(data: unknown): DataHookExecutionRecord {
  return dataHookExecutionRecordSchema.parse(data);
}

export function sortExecutionsByStartedAtDesc(
  records: readonly DataHookExecutionRecord[],
): DataHookExecutionRecord[] {
  return [...records].sort((left, right) =>
    right.startedAt.localeCompare(left.startedAt),
  );
}

function applyCursorToQuery<
  T extends { startAfter: (...values: unknown[]) => T },
>(query: T, cursor: HookExecutionListCursor | null | undefined): T {
  if (!cursor) {
    return query;
  }
  return query.startAfter(cursor.startedAt, cursor.id);
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
    async create(tenantId, input: CreateDataHookExecutionInput, options) {
      const parsed = createDataHookExecutionInputSchema.parse(input);
      const id = options?.id ?? `hookexec_${nanoid(12)}`;
      const record = toRecord({
        id,
        tenantId,
        ...parsed,
      });
      await collection(tenantId).doc(id).set(record);
      return record;
    },
    async update(tenantId, id, patch: UpdateDataHookExecutionPatch) {
      const docRef = collection(tenantId).doc(id);
      const snapshot = await docRef.get();
      if (!snapshot.exists) {
        throw new Error(`Data hook execution not found: ${id}`);
      }
      const current = toRecord({ id: snapshot.id, ...snapshot.data() });
      const next = toRecord({
        ...current,
        ...patch,
      });
      await docRef.set(next);
      return next;
    },
    async listByHookId(tenantId, hookId, options) {
      const limit = options?.limit ?? 50;
      let query = collection(tenantId)
        .where("hookId", "==", hookId)
        .orderBy("startedAt", "desc")
        .orderBy("id", "desc")
        .limit(limit);
      query = applyCursorToQuery(query, options?.cursor);
      const snapshot = await query.get();
      const items = snapshot.docs.map((doc) =>
        toRecord({ id: doc.id, ...doc.data() }),
      );
      return {
        items,
        nextCursor: buildHookExecutionNextCursor(items, limit),
      };
    },
    async listRecent(tenantId, options) {
      const limit = Math.min(Math.max(options?.limit ?? 50, 1), 100);
      let query = applyListRecentTimeRange(
        collection(tenantId),
        "startedAt",
        options,
      )
        .orderBy("startedAt", "desc")
        .orderBy("id", "desc")
        .limit(limit);
      query = applyCursorToQuery(query, options?.cursor);
      const snapshot = await query.get();
      const items = snapshot.docs.map((doc) =>
        toRecord({ id: doc.id, ...doc.data() }),
      );
      return {
        items,
        nextCursor: buildHookExecutionNextCursor(items, limit),
      };
    },
    async listByEntityRecord(tenantId, entityName, recordId, options) {
      const limit = Math.min(Math.max(options?.limit ?? 50, 1), 100);
      let query = applyListRecentTimeRange(
        collection(tenantId)
          .where("entityName", "==", entityName)
          .where("recordId", "==", recordId),
        "startedAt",
        options,
      )
        .orderBy("startedAt", "desc")
        .orderBy("id", "desc")
        .limit(limit);
      query = applyCursorToQuery(query, options?.cursor);
      const snapshot = await query.get();
      const items = snapshot.docs.map((doc) =>
        toRecord({ id: doc.id, ...doc.data() }),
      );
      return {
        items,
        nextCursor: buildHookExecutionNextCursor(items, limit),
      };
    },
    async listByEmailLedgerId(tenantId, emailLedgerId, options) {
      const limit = Math.min(Math.max(options?.limit ?? 50, 1), 100);
      let query = applyListRecentTimeRange(
        collection(tenantId).where("emailLedgerId", "==", emailLedgerId),
        "startedAt",
        options,
      )
        .orderBy("startedAt", "desc")
        .orderBy("id", "desc")
        .limit(limit);
      query = applyCursorToQuery(query, options?.cursor);
      const snapshot = await query.get();
      const items = snapshot.docs.map((doc) =>
        toRecord({ id: doc.id, ...doc.data() }),
      );
      return {
        items,
        nextCursor: buildHookExecutionNextCursor(items, limit),
      };
    },
    async listActive(tenantId) {
      const snapshot = await collection(tenantId)
        .where("status", "in", ["pending", "running"])
        .get();
      return sortExecutionsByStartedAtDesc(
        snapshot.docs.map((doc) => toRecord({ id: doc.id, ...doc.data() })),
      );
    },
    async countActiveByStatus(tenantId) {
      const active = await this.listActive(tenantId);
      return summarizeActiveExecutions(active);
    },
  };
}
