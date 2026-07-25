import { describe, expect, it } from "vitest";

import { clampProgressPercent } from "./ProgressBar.js";

describe("clampProgressPercent", () => {
  it("rounds and clamps into 0–100", () => {
    expect(clampProgressPercent(62.4)).toBe(62);
    expect(clampProgressPercent(62.6)).toBe(63);
    expect(clampProgressPercent(-5)).toBe(0);
    expect(clampProgressPercent(150)).toBe(100);
  });

  it("returns null for non-finite values", () => {
    expect(clampProgressPercent(Number.NaN)).toBeNull();
    expect(clampProgressPercent(Number.POSITIVE_INFINITY)).toBeNull();
  });
});
