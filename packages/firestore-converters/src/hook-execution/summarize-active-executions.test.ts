import { describe, expect, it } from "vitest";

import type { DataHookExecutionRecord } from "@repo/hooks";

import { summarizeActiveExecutions } from "./summarize-active-executions.js";

function activeRecord(
  overrides: Partial<DataHookExecutionRecord> &
    Pick<DataHookExecutionRecord, "status" | "executionMode">,
): DataHookExecutionRecord {
  return {
    id: "hookexec_test",
    tenantId: "tenant_a",
    hookId: "hook_1",
    hookName: "Hook",
    entityName: "deal",
    event: "deal.afterCreate",
    phase: "after",
    operation: "create",
    triggeredBy: { uid: "user_1" },
    startedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("summarizeActiveExecutions", () => {
  it("groups active executions by execution mode", () => {
    expect(
      summarizeActiveExecutions([
        activeRecord({ status: "pending", executionMode: "queued" }),
        activeRecord({
          id: "hookexec_2",
          status: "running",
          executionMode: "sync",
        }),
        activeRecord({
          id: "hookexec_3",
          status: "running",
          executionMode: "deferred",
        }),
        activeRecord({
          id: "hookexec_4",
          status: "running",
          executionMode: "queued",
        }),
      ]),
    ).toEqual({
      pending: 1,
      running: 3,
      queuedPending: 1,
      inlineRunning: 1,
      deferredRunning: 1,
      cloudRunning: 1,
    });
  });
});
