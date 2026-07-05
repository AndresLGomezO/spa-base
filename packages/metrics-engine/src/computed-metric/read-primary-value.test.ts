import { describe, expect, it } from "vitest";

import { computePercentChange } from "./read-primary-value.js";

describe("computePercentChange", () => {
  it("returns decimal ratio for percent display formatting", () => {
    expect(computePercentChange(110, 100)).toBe(0.1);
    expect(computePercentChange(90, 100)).toBe(-0.1);
    expect(computePercentChange(10, 0)).toBeNull();
  });
});
