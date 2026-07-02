import { describe, expect, it } from "vitest";

import type { DebugEvent } from "../../lib/api-client";

import {
  mergeAccumulatedDebugEvents,
  preferDebugEvent,
} from "./merge-accumulated-debug-events";

function hookEvent(
  overrides: Partial<DebugEvent> & Pick<DebugEvent, "id">,
): DebugEvent {
  return {
    source: "hookExecution",
    timestamp: "2026-07-02T22:00:00.000Z",
    title: "Hook",
    status: "success",
    summary: {},
    ...overrides,
  };
}

describe("preferDebugEvent", () => {
  it("prefers incoming when existing is absent", () => {
    const incoming = hookEvent({
      id: "exec_1",
      summary: { writesCreated: 12 },
    });
    expect(preferDebugEvent(undefined, incoming)).toBe(incoming);
  });

  it("updates running execution with completed write metrics", () => {
    const existing = hookEvent({
      id: "exec_1",
      status: "running",
      summary: { writesCreated: 0 },
    });
    const incoming = hookEvent({
      id: "exec_1",
      status: "success",
      summary: { writesCreated: 12 },
    });
    expect(preferDebugEvent(existing, incoming)).toBe(incoming);
  });
});

describe("mergeAccumulatedDebugEvents", () => {
  it("accumulates new ids without dropping older loaded ids", () => {
    const initial = new Map([
      [
        "hookExecution:exec_old",
        hookEvent({
          id: "exec_old",
          timestamp: "2026-07-02T20:00:00.000Z",
          summary: { writesCreated: 10 },
        }),
      ],
    ]);

    const merged = mergeAccumulatedDebugEvents(initial, [
      {
        items: [
          hookEvent({
            id: "exec_new",
            timestamp: "2026-07-02T22:00:00.000Z",
            summary: { writesCreated: 12 },
          }),
        ],
      },
    ]);

    expect(merged.size).toBe(2);
    expect(merged.get("hookExecution:exec_old")?.summary?.writesCreated).toBe(
      10,
    );
    expect(merged.get("hookExecution:exec_new")?.summary?.writesCreated).toBe(
      12,
    );
  });

  it("dedupes the same id across pages", () => {
    const merged = mergeAccumulatedDebugEvents(new Map(), [
      {
        items: [
          hookEvent({
            id: "exec_1",
            status: "running",
            summary: { writesCreated: 0 },
          }),
        ],
      },
      {
        items: [
          hookEvent({
            id: "exec_1",
            status: "running",
            summary: { writesCreated: 0 },
          }),
        ],
      },
    ]);

    expect(merged.size).toBe(1);
  });
});
