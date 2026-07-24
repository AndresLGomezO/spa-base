import { describe, expect, it, vi } from "vitest";

import {
  applyDateFilterToSearchParams,
  getCurrentDateBucket,
  getRelativeDateBucket,
  parseDateFilterParam,
} from "./use-dashboard-date-filter-url-state";

describe("parseDateFilterParam", () => {
  it("accepts year buckets", () => {
    expect(parseDateFilterParam("2026", "year")).toBe("2026");
    expect(parseDateFilterParam("2026-06", "year")).toBeNull();
  });

  it("accepts month buckets", () => {
    expect(parseDateFilterParam("2026-06", "month")).toBe("2026-06");
    expect(parseDateFilterParam("2026-13", "month")).toBeNull();
  });

  it("accepts day buckets", () => {
    expect(parseDateFilterParam("2026-06-15", "day")).toBe("2026-06-15");
    expect(parseDateFilterParam("2026-06-32", "day")).toBeNull();
  });
});

describe("getCurrentDateBucket", () => {
  it("returns local calendar buckets", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 5, 15, 12, 0, 0));

    expect(getCurrentDateBucket("year")).toBe("2026");
    expect(getCurrentDateBucket("month")).toBe("2026-06");
    expect(getCurrentDateBucket("day")).toBe("2026-06-15");

    vi.useRealTimers();
  });
});

describe("getRelativeDateBucket", () => {
  it("offsets by granularity unit", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 5, 15, 12, 0, 0));

    expect(getRelativeDateBucket("year", -1)).toBe("2025");
    expect(getRelativeDateBucket("month", -1)).toBe("2026-05");
    expect(getRelativeDateBucket("day", -1)).toBe("2026-06-14");
    expect(getRelativeDateBucket("month", 0)).toBe("2026-06");

    vi.setSystemTime(new Date(2026, 0, 1, 12, 0, 0));
    expect(getRelativeDateBucket("month", -1)).toBe("2025-12");
    expect(getRelativeDateBucket("day", -1)).toBe("2025-12-31");

    vi.useRealTimers();
  });
});

describe("applyDateFilterToSearchParams", () => {
  it("sets non-default values and clears current buckets", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 5, 15, 12, 0, 0));

    const monthParams = applyDateFilterToSearchParams(
      new URLSearchParams("q=test"),
      "month",
      "month",
      "2025-03",
    );
    expect(monthParams.get("month")).toBe("2025-03");

    const currentMonthParams = applyDateFilterToSearchParams(
      new URLSearchParams("month=2025-03"),
      "month",
      "month",
      "2026-06",
    );
    expect(currentMonthParams.has("month")).toBe(false);

    vi.useRealTimers();
  });
});
