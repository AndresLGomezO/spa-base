import { describe, expect, it } from "vitest";

import {
  formatCurrentDateBucket,
  resolveVisibleWhen,
} from "./resolve-visible-when.js";

describe("formatCurrentDateBucket", () => {
  const now = new Date("2026-07-12T15:30:00.000Z");

  it("formats year, month, and day buckets in UTC", () => {
    expect(formatCurrentDateBucket("year", now)).toBe("2026");
    expect(formatCurrentDateBucket("month", now)).toBe("2026-07");
    expect(formatCurrentDateBucket("day", now)).toBe("2026-07-12");
  });
});

describe("resolveVisibleWhen", () => {
  const now = new Date("2026-07-12T15:30:00.000Z");
  const rules = [
    {
      conditionKind: "dashboardDateFilter" as const,
      matchValue: "currentPeriod",
    },
  ];

  it("is visible when visibleWhen is omitted", () => {
    expect(resolveVisibleWhen(undefined, { referenceDate: now })).toBe(true);
  });

  it("is visible when the dashboard date filter is missing", () => {
    expect(resolveVisibleWhen(rules, { referenceDate: now })).toBe(true);
  });

  it("is visible when the filter matches the current period", () => {
    expect(
      resolveVisibleWhen(rules, {
        dashboardDateFilter: { value: "2026-07", granularity: "month" },
        referenceDate: now,
      }),
    ).toBe(true);
  });

  it("is hidden when the filter is not the current period", () => {
    expect(
      resolveVisibleWhen(rules, {
        dashboardDateFilter: { value: "2026-06", granularity: "month" },
        referenceDate: now,
      }),
    ).toBe(false);
  });

  it("compares using the filter granularity", () => {
    expect(
      resolveVisibleWhen(rules, {
        dashboardDateFilter: { value: "2026", granularity: "year" },
        referenceDate: now,
      }),
    ).toBe(true);
    expect(
      resolveVisibleWhen(rules, {
        dashboardDateFilter: { value: "2025", granularity: "year" },
        referenceDate: now,
      }),
    ).toBe(false);
  });

  it("ANDs multiple conditions", () => {
    const multi = [
      {
        conditionKind: "dashboardDateFilter" as const,
        matchValue: "currentPeriod",
      },
      {
        conditionKind: "field" as const,
        matchValue: "open",
        compareFieldPath: "status",
      },
    ];
    expect(
      resolveVisibleWhen(multi, {
        dashboardDateFilter: { value: "2026-07", granularity: "month" },
        referenceDate: now,
        resolveField: (path) => (path === "status" ? "open" : undefined),
      }),
    ).toBe(true);
    expect(
      resolveVisibleWhen(multi, {
        dashboardDateFilter: { value: "2026-07", granularity: "month" },
        referenceDate: now,
        resolveField: (path) => (path === "status" ? "closed" : undefined),
      }),
    ).toBe(false);
  });
});
