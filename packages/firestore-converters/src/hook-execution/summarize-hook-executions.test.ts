import { describe, expect, it } from "vitest";

import { summarizeHookExecutions } from "./summarize-hook-executions.js";

describe("summarizeHookExecutions", () => {
  it("aggregates execution counts, writes, and durations per hook", () => {
    const rows = summarizeHookExecutions([
      {
        id: "exec_1",
        tenantId: "tenant_a",
        hookId: "hook_a",
        hookName: "Seed schedules",
        entityName: "financialItem",
        event: "financialItem.afterCreate",
        phase: "after",
        operation: "create",
        executionMode: "sync",
        triggeredBy: { uid: "user_1" },
        startedAt: "2026-01-01T00:00:00.000Z",
        status: "success",
        durationMs: 100,
        writesCreated: 12,
      },
      {
        id: "exec_2",
        tenantId: "tenant_a",
        hookId: "hook_a",
        hookName: "Seed schedules",
        entityName: "financialItem",
        event: "financialItem.afterCreate",
        phase: "after",
        operation: "create",
        executionMode: "sync",
        triggeredBy: { uid: "user_1" },
        startedAt: "2026-01-01T00:01:00.000Z",
        status: "error",
        durationMs: 300,
        writesCreated: 4,
        error: "failed",
      },
    ]);

    expect(rows).toEqual([
      {
        hookId: "hook_a",
        hookName: "Seed schedules",
        executionCount: 2,
        errorCount: 1,
        totalWritesCreated: 16,
        totalWritesUpdated: 0,
        totalWritesDeleted: 0,
        avgDurationMs: 200,
        p95DurationMs: 300,
      },
    ]);
  });
});
