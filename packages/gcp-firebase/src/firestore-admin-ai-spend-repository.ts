import {
  AI_SPEND_COLLECTION,
  AI_SPEND_USERS_COLLECTION,
  aiSpendRecordSchema,
  tenantAiSpendDocId,
  userAiSpendDocId,
  type AiSpendDelta,
  type AiSpendRecord,
  type AiSpendRepository,
} from "@repo/ai-engine/spend";

import {
  FieldValue,
  getFirestoreAdmin,
  type FirebaseAdminConfig,
} from "./firebase-admin.js";
import { tenantEntityCollectionRef } from "./tenant-entity-path.js";

function parseRecord(data: unknown): AiSpendRecord {
  return aiSpendRecordSchema.parse(data);
}

export function createFirestoreAdminAiSpendRepository(
  config: FirebaseAdminConfig,
): AiSpendRepository {
  function tenantCollection(tenantId: string) {
    return tenantEntityCollectionRef(
      getFirestoreAdmin(config),
      tenantId,
      AI_SPEND_COLLECTION,
    );
  }

  function userCollection(tenantId: string) {
    return tenantEntityCollectionRef(
      getFirestoreAdmin(config),
      tenantId,
      AI_SPEND_USERS_COLLECTION,
    );
  }

  async function incrementDoc(
    docRef: ReturnType<ReturnType<typeof tenantCollection>["doc"]>,
    base: {
      readonly id: string;
      readonly tenantId: string;
      readonly period: string;
      readonly userId?: string;
    },
    delta: AiSpendDelta,
  ): Promise<AiSpendRecord> {
    const now = new Date().toISOString();
    await docRef.set(
      {
        id: base.id,
        tenantId: base.tenantId,
        period: base.period,
        ...(base.userId ? { userId: base.userId } : {}),
        inputTokens: FieldValue.increment(delta.inputTokens),
        outputTokens: FieldValue.increment(delta.outputTokens),
        estimatedCostUsd: FieldValue.increment(delta.estimatedCostUsd),
        updatedAt: now,
      },
      { merge: true },
    );
    const snapshot = await docRef.get();
    const data = snapshot.data() ?? {};
    return parseRecord({
      id: base.id,
      tenantId: base.tenantId,
      period: base.period,
      ...(base.userId ? { userId: base.userId } : {}),
      inputTokens: Number(data.inputTokens ?? 0),
      outputTokens: Number(data.outputTokens ?? 0),
      estimatedCostUsd: Number(data.estimatedCostUsd ?? 0),
      updatedAt: typeof data.updatedAt === "string" ? data.updatedAt : now,
    });
  }

  return {
    async getTenantPeriod(tenantId, period) {
      const id = tenantAiSpendDocId(period);
      const snapshot = await tenantCollection(tenantId).doc(id).get();
      if (!snapshot.exists) return null;
      return parseRecord({
        id,
        tenantId,
        period,
        ...snapshot.data(),
      });
    },
    async getUserPeriod(tenantId, userId, period) {
      const id = userAiSpendDocId(userId, period);
      const snapshot = await userCollection(tenantId).doc(id).get();
      if (!snapshot.exists) return null;
      return parseRecord({
        id,
        tenantId,
        period,
        userId,
        ...snapshot.data(),
      });
    },
    async incrementTenantPeriod(tenantId, period, delta) {
      const id = tenantAiSpendDocId(period);
      return incrementDoc(
        tenantCollection(tenantId).doc(id),
        { id, tenantId, period },
        delta,
      );
    },
    async incrementUserPeriod(tenantId, userId, period, delta) {
      const id = userAiSpendDocId(userId, period);
      return incrementDoc(
        userCollection(tenantId).doc(id),
        { id, tenantId, period, userId },
        delta,
      );
    },
  };
}
