import { describe, expect, it, vi } from "vitest";

import { createBatchedCallAi } from "./ai-call-batcher.js";
import { coerceNearDuplicateCreateChild } from "./call-data-hook-ai.js";

describe("createBatchedCallAi", () => {
  it("memoizes identical cacheKeys and batches distinct keys", async () => {
    const callAi = vi.fn(
      async (request: { cacheKey?: string; prompt: string }) => ({
        action: "useExisting",
        categoryId: request.cacheKey ?? "x",
      }),
    );
    const batchCallAi = vi.fn(
      async (requests: readonly { cacheKey?: string; prompt: string }[]) =>
        requests.map((request) => ({
          action: "useExisting",
          categoryId: request.cacheKey ?? "x",
        })),
    );

    const batcher = createBatchedCallAi({
      callAi: callAi as never,
      batchSize: 2,
      batchCallAi: batchCallAi as never,
    });

    const p1 = batcher.callAi({
      prompt: "a",
      tenantId: "tenant_test",
      cacheKey: "UBER TRIP",
    });
    const p2 = batcher.callAi({
      prompt: "b",
      tenantId: "tenant_test",
      cacheKey: "UBER TRIP",
    });
    const p3 = batcher.callAi({
      prompt: "c",
      tenantId: "tenant_test",
      cacheKey: "RAPPI",
    });

    await batcher.flush();
    const [r1, r2, r3] = await Promise.all([p1, p2, p3]);

    expect(r1.categoryId).toBe("UBER TRIP");
    expect(r2.categoryId).toBe("UBER TRIP");
    expect(r3.categoryId).toBe("RAPPI");
    expect(batchCallAi).toHaveBeenCalledTimes(1);
    expect(callAi).not.toHaveBeenCalled();
  });

  it("auto-flushes when pending reaches batchSize without an explicit flush", async () => {
    const callAi = vi.fn(async () => ({
      action: "useExisting",
      categoryId: "solo",
    }));
    const batcher = createBatchedCallAi({
      callAi: callAi as never,
      batchSize: 1,
    });

    const result = await batcher.callAi({
      prompt: "solo",
      tenantId: "tenant_test",
      cacheKey: "SOLO",
    });

    expect(result.categoryId).toBe("solo");
    expect(callAi).toHaveBeenCalledTimes(1);
  });
});

describe("coerceNearDuplicateCreateChild", () => {
  it("collapses Italian Food into existing Food", () => {
    const result = coerceNearDuplicateCreateChild(
      {
        action: "createChild",
        newCategoryName: "Italian Food",
        parentCategoryId: "expenses",
        kind: "EXPENSE",
        confidence: 0.9,
      },
      [
        { id: "food", name: "Food", parentId: "expenses" },
        { id: "transport", name: "Transport", parentId: "expenses" },
      ],
    );
    expect(result).toMatchObject({
      action: "useExisting",
      categoryId: "food",
    });
  });
});
