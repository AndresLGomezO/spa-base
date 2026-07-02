import { describe, expect, it } from "vitest";

import type { HookLogMessageRecord } from "./hook-log-message.js";
import { formatHookLogDebugPresentation } from "./format-hook-log-debug-presentation.js";

function hookLogRecord(
  overrides: Partial<HookLogMessageRecord> = {},
): HookLogMessageRecord {
  return {
    id: "hooklog_1",
    tenantId: "rates",
    level: "info",
    message: "Data hook notification",
    entityName: "loanDetails",
    timestamp: "2026-07-02T19:12:56.156Z",
    meta: {
      message: "",
      entityName: "loanDetails",
      event: "loanDetails.afterCreate",
      tenantId: "rates",
    },
    ...overrides,
  };
}

describe("formatHookLogDebugPresentation", () => {
  it("uses event as title for legacy generic notification logs", () => {
    const presentation = formatHookLogDebugPresentation(hookLogRecord());

    expect(presentation.title).toBe("loanDetails.afterCreate");
    expect(presentation.subtitle).toBe("loanDetails · loanDetails.afterCreate");
    expect(presentation.summary).toMatchObject({
      entityName: "loanDetails",
      event: "loanDetails.afterCreate",
    });
  });

  it("prefers the evaluated notification message when present", () => {
    const presentation = formatHookLogDebugPresentation(
      hookLogRecord({
        message: "Data hook notification",
        meta: {
          message: "Origination date missing",
          entityName: "loanDetails",
          event: "loanDetails.afterCreate",
          hookId: "hook_1",
          hookName: "Validate origination",
        },
        hookId: "hook_1",
      }),
    );

    expect(presentation.title).toBe("Origination date missing");
    expect(presentation.summary).toMatchObject({
      hookId: "hook_1",
      hookName: "Validate origination",
      message: "Origination date missing",
    });
  });

  it("uses the stored message when it is already descriptive", () => {
    const presentation = formatHookLogDebugPresentation(
      hookLogRecord({
        message: "Origination date missing",
        hookId: "hook_1",
        meta: {
          hookId: "hook_1",
          hookName: "Validate origination",
          entityName: "loanDetails",
          event: "loanDetails.afterCreate",
          action: "sendNotification",
        },
      }),
    );

    expect(presentation.title).toBe("Origination date missing");
    expect(presentation.summary.action).toBe("sendNotification");
  });

  it("formats hook errors with context", () => {
    const presentation = formatHookLogDebugPresentation(
      hookLogRecord({
        level: "error",
        message: "Deferred data hook failed",
        meta: {
          hookId: "hook_1",
          hookName: "Sync totals",
          entityName: "loanDetails",
          event: "loanDetails.afterUpdate",
          error: "Entity services are required",
        },
        hookId: "hook_1",
      }),
    );

    expect(presentation.title).toBe("Hook error: Entity services are required");
    expect(presentation.subtitle).toBe(
      "loanDetails · loanDetails.afterUpdate · Sync totals",
    );
  });
});
