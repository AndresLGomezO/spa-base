import { describe, expect, it } from "vitest";

import {
  assertAiSpendAllowed,
  AiSpendLimitError,
  emptyAiSpendCounters,
  evaluateAiSpend,
  mergeStrictestAiSpendLimits,
  recordAiSpendUsage,
  spendDeltaFromModelUsage,
  type AiSpendDelta,
  type AiSpendRecord,
  type AiSpendRepository,
} from "./index.js";

function createMemorySpendRepo(): AiSpendRepository {
  const tenant = new Map<string, AiSpendRecord>();
  const users = new Map<string, AiSpendRecord>();

  function apply(
    current: AiSpendRecord | undefined,
    base: Omit<
      AiSpendRecord,
      "inputTokens" | "outputTokens" | "estimatedCostUsd"
    >,
    delta: AiSpendDelta,
  ): AiSpendRecord {
    const next = {
      ...base,
      inputTokens: (current?.inputTokens ?? 0) + delta.inputTokens,
      outputTokens: (current?.outputTokens ?? 0) + delta.outputTokens,
      estimatedCostUsd:
        (current?.estimatedCostUsd ?? 0) + delta.estimatedCostUsd,
      updatedAt: new Date().toISOString(),
    };
    return next;
  }

  return {
    async getTenantPeriod(tenantId, period) {
      return tenant.get(`${tenantId}:${period}`) ?? null;
    },
    async getUserPeriod(tenantId, userId, period) {
      return users.get(`${tenantId}:${userId}:${period}`) ?? null;
    },
    async incrementTenantPeriod(tenantId, period, delta) {
      const key = `${tenantId}:${period}`;
      const next = apply(
        tenant.get(key),
        {
          id: `period_${period}`,
          tenantId,
          period,
          updatedAt: new Date().toISOString(),
        },
        delta,
      );
      tenant.set(key, next);
      return next;
    },
    async incrementUserPeriod(tenantId, userId, period, delta) {
      const key = `${tenantId}:${userId}:${period}`;
      const next = apply(
        users.get(key),
        {
          id: `${userId}_${period}`,
          tenantId,
          period,
          userId,
          updatedAt: new Date().toISOString(),
        },
        delta,
      );
      users.set(key, next);
      return next;
    },
  };
}

describe("mergeStrictestAiSpendLimits", () => {
  it("takes min of configured meters and leaves unset as unlimited", () => {
    expect(
      mergeStrictestAiSpendLimits([
        { monthlyInputTokens: 1000, monthlyBudgetUsd: 5 },
        { monthlyInputTokens: 500, monthlyOutputTokens: 200 },
      ]),
    ).toEqual({
      monthlyInputTokens: 500,
      monthlyOutputTokens: 200,
      monthlyBudgetUsd: 5,
    });
  });

  it("returns undefined when no limits are set", () => {
    expect(mergeStrictestAiSpendLimits([{}, null, undefined])).toBeUndefined();
  });
});

describe("assertAiSpendAllowed", () => {
  it("allows when under limits", () => {
    expect(() =>
      assertAiSpendAllowed({
        tenantLimits: { monthlyInputTokens: 100 },
        tenantUsed: {
          inputTokens: 50,
          outputTokens: 0,
          estimatedCostUsd: 0,
        },
      }),
    ).not.toThrow();
  });

  it("blocks when tenant meter is exhausted", () => {
    expect(() =>
      assertAiSpendAllowed({
        tenantLimits: { monthlyInputTokens: 100 },
        tenantUsed: {
          inputTokens: 100,
          outputTokens: 0,
          estimatedCostUsd: 0,
        },
      }),
    ).toThrow(AiSpendLimitError);
  });

  it("blocks on role meter for attributable users", () => {
    try {
      assertAiSpendAllowed({
        roleLimits: { monthlyBudgetUsd: 1 },
        userUsed: {
          inputTokens: 0,
          outputTokens: 0,
          estimatedCostUsd: 1,
        },
        checkRole: true,
      });
      expect.unreachable();
    } catch (error) {
      expect(error).toBeInstanceOf(AiSpendLimitError);
      expect((error as AiSpendLimitError).scope).toBe("role");
      expect((error as AiSpendLimitError).meter).toBe("monthlyBudgetUsd");
    }
  });

  it("skips role check for system jobs", () => {
    expect(() =>
      assertAiSpendAllowed({
        roleLimits: { monthlyInputTokens: 1 },
        userUsed: {
          inputTokens: 100,
          outputTokens: 0,
          estimatedCostUsd: 0,
        },
        checkRole: false,
      }),
    ).not.toThrow();
  });
});

describe("evaluateAiSpend soft warn", () => {
  it("softWarns when remaining under 10%", () => {
    const result = evaluateAiSpend({
      tenantLimits: { monthlyInputTokens: 1000 },
      tenantUsed: {
        inputTokens: 950,
        outputTokens: 0,
        estimatedCostUsd: 0,
      },
    });
    expect(result.blocked).toBe(false);
    expect(result.softWarn).toBe(true);
  });
});

describe("spendDeltaFromModelUsage + recordAiSpendUsage", () => {
  it("increments tenant and user counters from modelUsage", async () => {
    const repo = createMemorySpendRepo();
    expect(
      spendDeltaFromModelUsage({
        modelId: "gemini-test",
        promptTokens: 10,
        candidatesTokens: 3,
        thoughtsTokens: 2,
        estimatedCostUsd: 0.01,
      }),
    ).toEqual({
      inputTokens: 10,
      outputTokens: 5,
      estimatedCostUsd: 0.01,
    });

    await recordAiSpendUsage(repo, {
      tenantId: "t1",
      requestedBy: "user_1",
      modelUsage: {
        modelId: "gemini-test",
        promptTokens: 10,
        candidatesTokens: 3,
        thoughtsTokens: 2,
        estimatedCostUsd: 0.01,
      },
      now: () => new Date("2026-07-15T12:00:00.000Z"),
    });

    const tenantSpend = await repo.getTenantPeriod("t1", "2026-07");
    const userSpend = await repo.getUserPeriod("t1", "user_1", "2026-07");
    expect(tenantSpend?.inputTokens).toBe(10);
    expect(tenantSpend?.outputTokens).toBe(5);
    expect(userSpend?.estimatedCostUsd).toBe(0.01);
  });

  it("skips user ledger for system requestedBy", async () => {
    const repo = createMemorySpendRepo();
    await recordAiSpendUsage(repo, {
      tenantId: "t1",
      requestedBy: "system",
      modelUsage: {
        modelId: "gemini-test",
        promptTokens: 4,
        candidatesTokens: 1,
        estimatedCostUsd: 0.002,
      },
      now: () => new Date("2026-07-15T12:00:00.000Z"),
    });
    expect(await repo.getUserPeriod("t1", "system", "2026-07")).toBeNull();
    expect((await repo.getTenantPeriod("t1", "2026-07"))?.inputTokens).toBe(4);
  });
});

describe("emptyAiSpendCounters", () => {
  it("returns zeros", () => {
    expect(emptyAiSpendCounters()).toEqual({
      inputTokens: 0,
      outputTokens: 0,
      estimatedCostUsd: 0,
    });
  });
});
