import { describe, expect, it } from "vitest";

import { createInMemoryDataHookExecutionRepository } from "./in-memory-repository.js";

describe("createInMemoryDataHookExecutionRepository.listByEmailLedgerId", () => {
  it("returns only executions for the given email ledger id", async () => {
    const repo = createInMemoryDataHookExecutionRepository();
    await repo.create(
      "tenant_a",
      {
        hookId: "hook_1",
        hookName: "From email A",
        entityName: "financialItem",
        recordId: "fi_1",
        emailLedgerId: "email_a",
        event: "financialItem.afterEmail",
        phase: "after",
        operation: "email",
        executionMode: "sync",
        status: "success",
        triggeredBy: { uid: "user_1" },
        startedAt: "2026-07-23T12:00:00.000Z",
        finishedAt: "2026-07-23T12:00:01.000Z",
        durationMs: 1,
      },
      { id: "exec_a" },
    );
    await repo.create(
      "tenant_a",
      {
        hookId: "hook_1",
        hookName: "From email B",
        entityName: "financialItem",
        recordId: "fi_1",
        emailLedgerId: "email_b",
        event: "financialItem.afterEmail",
        phase: "after",
        operation: "email",
        executionMode: "sync",
        status: "success",
        triggeredBy: { uid: "user_1" },
        startedAt: "2026-07-23T12:01:00.000Z",
        finishedAt: "2026-07-23T12:01:01.000Z",
        durationMs: 1,
      },
      { id: "exec_b" },
    );

    const page = await repo.listByEmailLedgerId("tenant_a", "email_a");
    expect(page.items.map((item) => item.id)).toEqual(["exec_a"]);
  });
});
