import {
  aiSpendRecordSchema,
  emptyAiSpendCounters,
  tenantAiSpendDocId,
  userAiSpendDocId,
  type AiSpendDelta,
  type AiSpendRecord,
  type AiSpendRepository,
} from "@repo/ai-engine/spend";

export function createInMemoryAiSpendRepository(): AiSpendRepository & {
  clear(): void;
} {
  const tenantStore = new Map<string, AiSpendRecord>();
  const userStore = new Map<string, AiSpendRecord>();

  function tenantKey(tenantId: string, period: string): string {
    return `${tenantId}::${period}`;
  }

  function userKey(tenantId: string, userId: string, period: string): string {
    return `${tenantId}::${userId}::${period}`;
  }

  function applyDelta(
    current: AiSpendRecord | undefined,
    base: {
      readonly id: string;
      readonly tenantId: string;
      readonly period: string;
      readonly userId?: string;
    },
    delta: AiSpendDelta,
  ): AiSpendRecord {
    const counters = current ?? {
      ...emptyAiSpendCounters(),
      ...base,
      updatedAt: new Date().toISOString(),
    };
    return aiSpendRecordSchema.parse({
      ...counters,
      inputTokens: counters.inputTokens + delta.inputTokens,
      outputTokens: counters.outputTokens + delta.outputTokens,
      estimatedCostUsd: counters.estimatedCostUsd + delta.estimatedCostUsd,
      updatedAt: new Date().toISOString(),
    });
  }

  return {
    clear() {
      tenantStore.clear();
      userStore.clear();
    },
    async getTenantPeriod(tenantId, period) {
      return tenantStore.get(tenantKey(tenantId, period)) ?? null;
    },
    async getUserPeriod(tenantId, userId, period) {
      return userStore.get(userKey(tenantId, userId, period)) ?? null;
    },
    async incrementTenantPeriod(tenantId, period, delta) {
      const id = tenantAiSpendDocId(period);
      const key = tenantKey(tenantId, period);
      const next = applyDelta(
        tenantStore.get(key),
        { id, tenantId, period },
        delta,
      );
      tenantStore.set(key, next);
      return next;
    },
    async incrementUserPeriod(tenantId, userId, period, delta) {
      const id = userAiSpendDocId(userId, period);
      const key = userKey(tenantId, userId, period);
      const next = applyDelta(
        userStore.get(key),
        { id, tenantId, period, userId },
        delta,
      );
      userStore.set(key, next);
      return next;
    },
  };
}
