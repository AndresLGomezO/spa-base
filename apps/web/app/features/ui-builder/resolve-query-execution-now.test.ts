import { describe, expect, it } from "vitest";

import { resolveQueryExecutionNow } from "./execute-entity-query-definition";

describe("resolveQueryExecutionNow (web re-export)", () => {
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
});
