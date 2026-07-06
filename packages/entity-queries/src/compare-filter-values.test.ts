import { describe, expect, it } from "vitest";

import { compareFilterValues } from "./compare-filter-values.js";

describe("compareFilterValues", () => {
  it("compares date-only values against ISO temporal bounds", () => {
    const dueDate = "2026-07-06";
    const startOfDay = "2026-07-06T00:00:00.000Z";
    const endOfDay = "2026-07-06T23:59:59.999Z";

    expect(compareFilterValues(dueDate, startOfDay)).toBeGreaterThanOrEqual(0);
    expect(compareFilterValues(dueDate, endOfDay)).toBeLessThanOrEqual(0);
  });

  it("compares numeric values directly", () => {
    expect(compareFilterValues(10, 5)).toBe(5);
    expect(compareFilterValues("alpha", "beta")).toBeLessThan(0);
  });
});
