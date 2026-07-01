import { describe, expect, it } from "vitest";

import type { DataHookExecutionRecord } from "@repo/hooks";

import { sortExecutionsByStartedAtDesc } from "./firestore-admin-hook-execution-repository.js";

function execution(id: string, startedAt: string): DataHookExecutionRecord {
  return {
    id,
    tenantId: "tenant_a",
    hookId: "hook_1",
    hookName: "Test",
    entityName: "alert",
    event: "alert.afterCreate",
    phase: "after",
    operation: "create",
    executionMode: "sync",
    status: "success",
    durationMs: 1,
    triggeredBy: { uid: "user_1" },
    startedAt,
    finishedAt: startedAt,
  };
}

describe("sortExecutionsByStartedAtDesc", () => {
  it("orders newest startedAt first", () => {
    const sorted = sortExecutionsByStartedAtDesc([
      execution("a", "2026-01-01T00:00:00.000Z"),
      execution("b", "2026-03-01T00:00:00.000Z"),
      execution("c", "2026-02-01T00:00:00.000Z"),
    ]);

    expect(sorted.map((record) => record.id)).toEqual(["b", "c", "a"]);
  });
});
