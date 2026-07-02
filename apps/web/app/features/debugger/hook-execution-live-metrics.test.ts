import { describe, expect, it } from "vitest";

import type { DebugEvent } from "../../lib/api-client";

import {
  eventMatchesHookExecutionStatusFilter,
  eventMatchesHookExecutionType,
  hookExecutionTypeForEvent,
  parseHookExecutionStatusFilters,
  parseHookExecutionTypes,
} from "./hook-execution-live-metrics";

function hookEvent(
  overrides: Partial<DebugEvent> & Pick<DebugEvent, "status">,
): DebugEvent {
  return {
    id: "hookexec_1",
    source: "hookExecution",
    timestamp: "2026-01-01T00:00:00.000Z",
    title: "Hook",
    summary: {
      executionMode: "sync",
    },
    ...overrides,
  };
}

describe("hookExecutionTypeForEvent", () => {
  it("maps execution mode regardless of status", () => {
    expect(
      hookExecutionTypeForEvent(
        hookEvent({
          status: "success",
          summary: { executionMode: "sync" },
        }),
      ),
    ).toBe("sync");
    expect(
      hookExecutionTypeForEvent(
        hookEvent({
          status: "running",
          summary: { executionMode: "deferred" },
        }),
      ),
    ).toBe("deferred");
    expect(
      hookExecutionTypeForEvent(
        hookEvent({
          status: "pending",
          summary: { executionMode: "queued" },
        }),
      ),
    ).toBe("queued");
  });
});

describe("parseHookExecutionTypes", () => {
  it("parses execution type query values", () => {
    expect(parseHookExecutionTypes("sync,queued,deferred")).toEqual([
      "sync",
      "queued",
      "deferred",
    ]);
  });
});

describe("eventMatchesHookExecutionType", () => {
  it("matches all events for a selected execution mode", () => {
    const successSync = hookEvent({
      status: "success",
      summary: { executionMode: "sync" },
    });

    expect(eventMatchesHookExecutionType(successSync, "sync")).toBe(true);
    expect(eventMatchesHookExecutionType(successSync, "deferred")).toBe(false);
  });
});

describe("eventMatchesHookExecutionStatusFilter", () => {
  it("maps queued filter to pending status", () => {
    const queued = hookEvent({
      status: "pending",
      summary: { executionMode: "queued" },
    });

    expect(eventMatchesHookExecutionStatusFilter(queued, "queued")).toBe(true);
    expect(eventMatchesHookExecutionStatusFilter(queued, "running")).toBe(
      false,
    );
  });
});

describe("parseHookExecutionStatusFilters", () => {
  it("parses hook execution status filters", () => {
    expect(parseHookExecutionStatusFilters("running,queued,success")).toEqual([
      "running",
      "queued",
      "success",
    ]);
  });
});
