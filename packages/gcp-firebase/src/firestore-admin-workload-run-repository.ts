import {
  WORKLOAD_RUNS_COLLECTION,
  type CreateWorkloadRunInput,
  type UpdateWorkloadRunPatch,
  type WorkloadRunRecord,
  type WorkloadRunRepository,
} from "@repo/workload-runs";

import { getFirestoreAdmin, type FirebaseAdminConfig } from "./firebase-admin.js";

export function createFirestoreAdminWorkloadRunRepository(
  config: FirebaseAdminConfig,
): WorkloadRunRepository {
  function collection() {
    return getFirestoreAdmin(config).collection(WORKLOAD_RUNS_COLLECTION);
  }

  function toRecord(
    doc: FirebaseFirestore.DocumentSnapshot,
  ): WorkloadRunRecord | null {
    const data = doc.data();
    if (!data) return null;
    return { id: doc.id, ...data } as unknown as WorkloadRunRecord;
  }

  return {
    async getById(id) {
      const doc = await collection().doc(id).get();
      return toRecord(doc);
    },

    async upsert(input: CreateWorkloadRunInput) {
      const { id, ...rest } = input;
      await collection().doc(id).set(rest, { merge: true });
      const doc = await collection().doc(id).get();
      return toRecord(doc)!;
    },

    async update(id, patch: UpdateWorkloadRunPatch) {
      const cleanPatch = Object.fromEntries(
        Object.entries(patch).filter(([, v]) => v !== undefined),
      );
      await collection().doc(id).set(cleanPatch, { merge: true });
      const doc = await collection().doc(id).get();
      return toRecord(doc)!;
    },

    async listByWorkloadId(workloadId, options) {
      let query: FirebaseFirestore.Query = collection()
        .where("workloadId", "==", workloadId)
        .orderBy("startedAt", "desc");

      if (options?.since) {
        query = query.where("startedAt", ">=", options.since);
      }
      if (options?.until) {
        query = query.where("startedAt", "<=", options.until);
      }
      if (options?.status) {
        query = query.where("status", "==", options.status);
      }
      if (options?.triggeredBy) {
        query = query.where("triggeredBy", "==", options.triggeredBy);
      }

      if (options?.cursor) {
        const [cursorStartedAt, cursorId] = decodeCursor(options.cursor);
        if (cursorStartedAt && cursorId) {
          query = query.startAfter(cursorStartedAt, cursorId);
        }
      }

      const limit = options?.limit ?? 50;
      const snapshot = await query.limit(limit + 1).get();
      const docs = snapshot.docs.map((d) => toRecord(d)!);

      const hasMore = docs.length > limit;
      const items = hasMore ? docs.slice(0, limit) : docs;
      const last = items.at(-1);
      const nextCursor =
        hasMore && last ? encodeCursor(last.startedAt, last.id) : null;

      return { items, nextCursor };
    },

    async listByRootRunId(rootRunId) {
      const snapshot = await collection()
        .where("rootRunId", "==", rootRunId)
        .orderBy("startedAt", "asc")
        .get();
      return snapshot.docs.map((d) => toRecord(d)!);
    },

    async countByWorkloadIdSince(workloadId, since) {
      const snapshot = await collection()
        .where("workloadId", "==", workloadId)
        .where("startedAt", ">=", since)
        .orderBy("startedAt", "desc")
        .limit(500)
        .get();

      const counts: Record<string, number> = {
        success: 0,
        error: 0,
        timeout: 0,
        running: 0,
        cancelled: 0,
      };

      for (const doc of snapshot.docs) {
        const data = doc.data();
        const status = data?.status as string | undefined;
        if (status && status in counts) {
          counts[status]!++;
        }
      }

      return counts as {
        success: number;
        error: number;
        timeout: number;
        running: number;
        cancelled: number;
      };
    },
  };
}

function encodeCursor(startedAt: string, id: string): string {
  return Buffer.from(`${startedAt}\0${id}`).toString("base64url");
}

function decodeCursor(cursor: string): [string | null, string | null] {
  try {
    const decoded = Buffer.from(cursor, "base64url").toString();
    const idx = decoded.indexOf("\0");
    if (idx < 0) return [null, null];
    return [decoded.slice(0, idx), decoded.slice(idx + 1)];
  } catch {
    return [null, null];
  }
}
