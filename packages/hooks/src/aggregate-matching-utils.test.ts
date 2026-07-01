import { describe, expect, it } from "vitest";

import { computeAggregateMatching } from "./aggregate-matching-utils.js";
import { HookExecutionError } from "./types.js";

describe("computeAggregateMatching", () => {
  it("counts matching records", () => {
    expect(
      computeAggregateMatching("count", undefined, [
        { id: "a", tenantId: "t" },
        { id: "b", tenantId: "t" },
      ]),
    ).toBe(2);
    expect(computeAggregateMatching("count", undefined, [])).toBe(0);
  });

  it("sums numeric field values", () => {
    expect(
      computeAggregateMatching("sum", "amount", [
        { id: "a", tenantId: "t", amount: 10 },
        { id: "b", tenantId: "t", amount: 25 },
      ]),
    ).toBe(35);
    expect(computeAggregateMatching("sum", "amount", [])).toBe(0);
  });

  it("computes min and max for ISO date strings", () => {
    const matches = [
      { id: "a", tenantId: "t", dueDate: "2026-03-01T00:00:00.000Z" },
      { id: "b", tenantId: "t", dueDate: "2026-01-15T00:00:00.000Z" },
      { id: "c", tenantId: "t", dueDate: "2026-06-01T00:00:00.000Z" },
    ];
    expect(computeAggregateMatching("min", "dueDate", matches)).toBe(
      "2026-01-15T00:00:00.000Z",
    );
    expect(computeAggregateMatching("max", "dueDate", matches)).toBe(
      "2026-06-01T00:00:00.000Z",
    );
    expect(computeAggregateMatching("min", "dueDate", [])).toBeNull();
  });

  it("computes average of numeric field values", () => {
    expect(
      computeAggregateMatching("avg", "score", [
        { id: "a", tenantId: "t", score: 10 },
        { id: "b", tenantId: "t", score: 20 },
      ]),
    ).toBe(15);
    expect(computeAggregateMatching("avg", "score", [])).toBeNull();
  });

  it("rejects non-numeric values for sum", () => {
    expect(() =>
      computeAggregateMatching("sum", "amount", [
        { id: "a", tenantId: "t", amount: "10" },
      ]),
    ).toThrow(HookExecutionError);
  });
});
