import { describe, expect, it } from "vitest";

import {
  getNextCronOccurrence,
  getPreviousCronOccurrence,
  msUntilNextRun,
  resolveWorkloadScheduleTiming,
} from "./schedule-timing.js";

describe("schedule-timing", () => {
  it("computes next and previous for every-minute cron", () => {
    const from = new Date("2026-07-27T12:00:30.000Z");
    const next = getNextCronOccurrence("* * * * *", {
      timezone: "UTC",
      from,
    });
    const prev = getPreviousCronOccurrence("* * * * *", {
      timezone: "UTC",
      from,
    });
    expect(next?.toISOString()).toBe("2026-07-27T12:01:00.000Z");
    expect(prev?.toISOString()).toBe("2026-07-27T12:00:00.000Z");
  });

  it("computes next for every-5-minutes", () => {
    const from = new Date("2026-07-27T12:01:00.000Z");
    const next = getNextCronOccurrence("*/5 * * * *", {
      timezone: "UTC",
      from,
    });
    expect(next?.toISOString()).toBe("2026-07-27T12:05:00.000Z");
  });

  it("prefers live nextRunTime when still upcoming", () => {
    const now = new Date("2026-07-27T12:00:00.000Z");
    const timing = resolveWorkloadScheduleTiming(
      {
        schedule: { cron: "0 21 * * *", timezone: "UTC" },
        live: { nextRunTime: "2026-07-27T12:03:00.000Z" },
      },
      now,
    );
    expect(timing.nextFromLive).toBe(true);
    expect(timing.nextAt?.toISOString()).toBe("2026-07-27T12:03:00.000Z");
  });

  it("falls back to cron when live next is stale", () => {
    const now = new Date("2026-07-27T12:00:00.000Z");
    const timing = resolveWorkloadScheduleTiming(
      {
        schedule: { cron: "0 21 * * *", timezone: "UTC" },
        live: { nextRunTime: "2026-07-27T11:00:00.000Z" },
      },
      now,
    );
    expect(timing.nextFromLive).toBe(false);
    expect(timing.nextAt?.toISOString()).toBe("2026-07-27T21:00:00.000Z");
  });

  it("uses live lastAttemptTime when present", () => {
    const now = new Date("2026-07-27T12:00:00.000Z");
    const timing = resolveWorkloadScheduleTiming(
      {
        schedule: { cron: "* * * * *", timezone: "UTC" },
        live: { lastAttemptTime: "2026-07-27T11:59:00.000Z" },
      },
      now,
    );
    expect(timing.lastFromLive).toBe(true);
    expect(timing.lastAt?.toISOString()).toBe("2026-07-27T11:59:00.000Z");
  });

  it("returns ms until next run", () => {
    const now = new Date("2026-07-27T12:00:00.000Z");
    const nextAt = new Date("2026-07-27T12:00:45.000Z");
    expect(msUntilNextRun({ nextAt }, now)).toBe(45_000);
  });
});
