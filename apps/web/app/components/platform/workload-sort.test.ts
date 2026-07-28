import { describe, expect, it, vi } from "vitest";

import type { WorkloadWithState } from "../../lib/admin-client";
import { sortWorkloads } from "./workload-ui-shared";

function scheduled(
  id: string,
  cron: string,
  displayName = id,
): WorkloadWithState {
  return {
    id,
    kind: "scheduledDataHook",
    source: "hook",
    domain: "platform",
    displayName,
    actions: ["disable"],
    schedule: { cron, timezone: "UTC" },
    state: {
      status: "scheduled",
      fetchedAt: "2026-07-27T12:00:00.000Z",
    },
  };
}

describe("sortWorkloads scheduleTime", () => {
  it("uses a single clock so order is transitive", () => {
    const now = new Date("2026-07-27T12:01:30.000Z");
    const items = [
      scheduled("late", "0 21 * * *", "Late"),
      scheduled("soon", "*/5 * * * *", "Soon"),
      scheduled("minute", "* * * * *", "Minute"),
      {
        id: "queue",
        kind: "cloudTasksQueue" as const,
        source: "system" as const,
        domain: "platform" as const,
        displayName: "Queue",
        actions: ["pause" as const],
        state: {
          status: "ready" as const,
          fetchedAt: "2026-07-27T12:00:00.000Z",
        },
      },
    ];

    const sorted = sortWorkloads(items, "scheduleTime", now);
    expect(sorted.map((w) => w.id)).toEqual([
      "minute", // 12:02
      "soon", // 12:05
      "late", // 21:00
      "queue", // no schedule → end
    ]);
  });

  it("does not call Date inside the comparator", () => {
    const now = new Date("2026-07-27T12:00:00.000Z");
    const spy = vi.spyOn(globalThis, "Date");
    // Constructing `now` already used Date; reset after.
    spy.mockClear();

    sortWorkloads(
      [
        scheduled("a", "*/5 * * * *", "A"),
        scheduled("b", "* * * * *", "B"),
        scheduled("c", "0 6 * * *", "C"),
      ],
      "scheduleTime",
      now,
    );

    // resolveWorkloadScheduleTiming / cron-parser may read time via Date methods
    // on the provided `now`, but must not construct a fresh clock per compare.
    const constructed = spy.mock.calls.filter(
      (call) => (call as readonly unknown[]).length === 0,
    );
    expect(constructed.length).toBe(0);
    spy.mockRestore();
  });
});
