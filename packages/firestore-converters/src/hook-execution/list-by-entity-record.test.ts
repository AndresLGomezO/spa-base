import { describe, expect, it } from "vitest";

import { createInMemoryDataHookExecutionRepository } from "./in-memory-repository.js";

describe("createInMemoryDataHookExecutionRepository.listByEntityRecord", () => {
  it("returns only executions for the given entity and record", async () => {
    const repo = createInMemoryDataHookExecutionRepository();
    await repo.create(
      "tenant_a",
      {
        hookId: "hook_1",
        hookName: "A",
        entityName: "deal",
        recordId: "deal_1",
        event: "deal.afterCreate",
        phase: "after",
        operation: "create",
        executionMode: "sync",
        status: "success",
        triggeredBy: { uid: "user_1" },
        startedAt: "2026-07-23T12:00:00.000Z",
        finishedAt: "2026-07-23T12:00:01.000Z",
        durationMs: 1,
      },
      { id: "exec_1" },
    );
    await repo.create(
      "tenant_a",
      {
        hookId: "hook_1",
        hookName: "B",
        entityName: "deal",
        recordId: "deal_2",
        event: "deal.afterCreate",
        phase: "after",
        operation: "create",
        executionMode: "sync",
        status: "success",
        triggeredBy: { uid: "user_1" },
        startedAt: "2026-07-23T12:01:00.000Z",
        finishedAt: "2026-07-23T12:01:01.000Z",
        durationMs: 1,
      },
      { id: "exec_2" },
    );

    const page = await repo.listByEntityRecord("tenant_a", "deal", "deal_1");
    expect(page.items.map((item) => item.id)).toEqual(["exec_1"]);
  });
});
