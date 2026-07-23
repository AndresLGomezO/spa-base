import { AI_JOBS_COLLECTION, aiJobRecordSchema } from "@repo/ai-engine/schemas";
import type { Query } from "firebase-admin/firestore";
import { nanoid } from "nanoid";

import type { AiJobRepository } from "./ai-job-repository-contract.js";
import {
  getFirestoreAdmin,
  type FirebaseAdminConfig,
} from "./firebase-admin.js";
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
        status: "pending",
        input: input.input,
        output: null,
        error: null,
        progress: null,
        draft: null,
        requestedBy: input.requestedBy,
        permission: input.permission,
        createdAt: now,
        updatedAt: now,
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
    async listRecent(tenantId, options) {
      const limit = Math.min(Math.max(options?.limit ?? 20, 1), 1000);
      let query: Query = collection(tenantId);
      if (options?.since) {
        query = query.where("updatedAt", ">=", options.since);
      }
      if (options?.until) {
        query = query.where("updatedAt", "<=", options.until);
      }
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
        .slice(0, limit);
      return records;
    },
  };
}
