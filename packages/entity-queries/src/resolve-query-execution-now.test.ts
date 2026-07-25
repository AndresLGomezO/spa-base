import { describe, expect, it } from "vitest";

import { resolveTemporalPreset } from "./temporal.js";
import {
  inferDateBucketGranularity,
  resolveQueryExecutionNow,
  resolveQueryExecutionNowFromDateBucket,
} from "./resolve-query-execution-now.js";

describe("resolveQueryExecutionNow", () => {
  it("uses the dashboard month bucket as the temporal anchor", () => {
    const now = resolveQueryExecutionNow({
      dashboardDateFilter: {
        value: "2025-03",
        granularity: "month",
        param: "month",
      },
    });

    expect(now.toISOString()).toBe("2025-03-15T00:00:00.000Z");
  });

  it("falls back to the real current time without dashboard context", () => {
    const before = Date.now();
    const now = resolveQueryExecutionNow();
    const after = Date.now();

    expect(now.getTime()).toBeGreaterThanOrEqual(before);
    expect(now.getTime()).toBeLessThanOrEqual(after);
  });

  it("anchors startOfWeek/endOfWeek to the selected month, not wall clock", () => {
    const now = resolveQueryExecutionNowFromDateBucket("2024-01", "month");
    expect(resolveTemporalPreset("startOfWeek", now)).toBe(
      "2024-01-15T00:00:00.000Z",
    );
    // 2024-01-15 was a Monday → week is Jan 15–21
    expect(resolveTemporalPreset("endOfWeek", now)).toBe(
      "2024-01-21T23:59:59.999Z",
    );
  });
});

describe("inferDateBucketGranularity", () => {
  it("detects day, month, and year shapes", () => {
    expect(inferDateBucketGranularity("2025-03-15")).toBe("day");
    expect(inferDateBucketGranularity("2025-03")).toBe("month");
    expect(inferDateBucketGranularity("2025")).toBe("year");
  });
});
