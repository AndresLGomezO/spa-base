import { describe, expect, it } from "vitest";

import { resolveQueryExecutionNow } from "./execute-entity-query-definition";

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
});
