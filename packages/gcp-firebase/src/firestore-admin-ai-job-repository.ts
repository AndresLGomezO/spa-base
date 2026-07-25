import { AI_JOBS_COLLECTION, aiJobRecordSchema } from "@repo/ai-engine/schemas";
import { sanitizeStepTraceForPersistence } from "@repo/ai-engine/sanitize-ai-job-persistence";
import { nanoid } from "nanoid";

import type { AiJobRepository } from "@repo/firestore-converters/ai-job";

import {
  getFirestoreAdmin,
  type FirebaseAdminConfig,
} from "./firebase-admin.js";
import { applyListRecentTimeRange } from "./apply-list-recent-time-range.js";
import { tenantEntityCollectionRef } from "./tenant-entity-path.js";

export function createFirestoreAdminAiJobRepository(
  config: FirebaseAdminConfig,
): AiJobRepository {
  function collection(tenantId: string) {
    return tenantEntityCollectionRef(
      getFirestoreAdmin(config),
      tenantId,
      AI_JOBS_COLLECTION,
    );
  }

  return {
    async create(tenantId, input) {
      const now = new Date().toISOString();
      const id = `aijob_${nanoid(12)}`;
      const record = aiJobRecordSchema.parse({
        id,
        tenantId,
        feature: input.feature,
        status: input.status ?? "pending",
        input: input.input,
        output: null,
        error: input.error ?? null,
        progress: null,
        draft: null,
        requestedBy: input.requestedBy,
        permission: input.permission,
        createdAt: now,
        updatedAt: now,
        ...(input.operation ? { operation: input.operation } : {}),
        ...(input.parentJobId ? { parentJobId: input.parentJobId } : {}),
        ...(input.contextRef ? { contextRef: input.contextRef } : {}),
      });
      await collection(tenantId).doc(id).set(record);
      return record;
    },
    async getById(tenantId, id) {
      const snapshot = await collection(tenantId).doc(id).get();
      if (!snapshot.exists) return null;
      return aiJobRecordSchema.parse({
        id: snapshot.id,
        ...snapshot.data(),
      });
    },
    async update(tenantId, id, patch) {
      const current = await this.getById(tenantId, id);
      if (!current) {
        throw new Error(`AI job not found: ${id}`);
      }

      const next = aiJobRecordSchema.parse({
        ...current,
        ...patch,
        updatedAt: new Date().toISOString(),
      });
      await collection(tenantId).doc(id).set(next);
      return next;
    },
    async appendStepTrace(tenantId, id, entry) {
      const current = await this.getById(tenantId, id);
      if (!current) {
        throw new Error(`AI job not found: ${id}`);
      }
      const nextTrace = sanitizeStepTraceForPersistence([
        ...(current.stepTrace ?? []),
        entry,
      ]);
      const next = aiJobRecordSchema.parse({
        ...current,
        stepTrace: nextTrace,
        updatedAt: new Date().toISOString(),
      });
      await collection(tenantId).doc(id).set(next);
      return next;
    },
    async listRecent(tenantId, options) {
      const limit = Math.min(Math.max(options?.limit ?? 20, 1), 1000);
      const query = applyListRecentTimeRange(
        collection(tenantId),
        "updatedAt",
        options,
      );
      const snapshot = await query
        .orderBy("updatedAt", "desc")
        .limit(limit * 3)
        .get();
      const records = snapshot.docs
        .map((doc) =>
          aiJobRecordSchema.parse({
            id: doc.id,
            ...doc.data(),
          }),
        )
        .filter((record) =>
          options?.feature ? record.feature === options.feature : true,
        )
        .filter((record) =>
          options?.parentJobId
            ? record.parentJobId === options.parentJobId
            : true,
        )
        .slice(0, limit);
      return records;
    },
  };
}
