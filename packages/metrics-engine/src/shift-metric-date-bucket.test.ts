import { describe, expect, it } from "vitest";

import { shiftMetricDateBucket } from "./date-granularity.js";

describe("shiftMetricDateBucket", () => {
  it("shifts month buckets across year boundary", () => {
    expect(shiftMetricDateBucket("2026-01", "month", -1)).toBe("2025-12");
  });

  it("shifts month buckets forward", () => {
    expect(shiftMetricDateBucket("2026-06", "month", 1)).toBe("2026-07");
  });

  it("shifts year buckets", () => {
    expect(shiftMetricDateBucket("2026", "year", -1)).toBe("2025");
  });

  it("shifts day buckets", () => {
    expect(shiftMetricDateBucket("2026-06-15", "day", -1)).toBe("2026-06-14");
  });

  it("returns null for invalid bucket input", () => {
    expect(shiftMetricDateBucket("invalid", "month", -1)).toBeNull();
  });
});
