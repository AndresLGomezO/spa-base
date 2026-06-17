import { describe, expect, it } from "vitest";

import {
  applyDateGranularityToQuerySlice,
  applyDateGranularityToSlice,
  isMetricDateBucketInputComplete,
  normalizeMetricDateValue,
} from "./date-granularity.js";

describe("normalizeMetricDateValue", () => {
  it("normalizes to day in UTC", () => {
    expect(normalizeMetricDateValue("2026-06-02T14:30:00.000Z", "day")).toBe(
      "2026-06-02",
    );
  });

  it("normalizes to month in UTC", () => {
    expect(normalizeMetricDateValue("2026-06-02T14:30:00.000Z", "month")).toBe(
      "2026-06",
    );
  });

  it("normalizes to year in UTC", () => {
    expect(normalizeMetricDateValue("2026-06-02T14:30:00.000Z", "year")).toBe(
      "2026",
    );
  });

  it("uses UTC boundary for month rollover", () => {
    expect(normalizeMetricDateValue("2026-01-01T00:00:00.000Z", "month")).toBe(
      "2026-01",
    );
  });

  it("returns null for invalid values", () => {
    expect(normalizeMetricDateValue("not-a-date", "day")).toBeNull();
    expect(normalizeMetricDateValue("", "day")).toBeNull();
  });
});

describe("isMetricDateBucketInputComplete", () => {
  it("accepts complete month bucket strings", () => {
    expect(isMetricDateBucketInputComplete("2026-06", "month")).toBe(true);
  });

  it("rejects partial manual month input while typing", () => {
    expect(isMetricDateBucketInputComplete("2026", "month")).toBe(false);
    expect(isMetricDateBucketInputComplete("2026-0", "month")).toBe(false);
    expect(isMetricDateBucketInputComplete("", "month")).toBe(false);
  });

  it("accepts ISO timestamps from entity fields", () => {
    expect(
      isMetricDateBucketInputComplete("2026-06-02T14:30:00.000Z", "month"),
    ).toBe(true);
  });
});

describe("applyDateGranularityToSlice", () => {
  it("normalizes date fields in group slice", () => {
    const slice = applyDateGranularityToSlice(
      {
        date: "2026-06-02T14:30:00.000Z",
        categoryId: "food",
      },
      ["date", "categoryId"],
      { date: "month" },
    );

    expect(slice).toEqual({
      date: "2026-06",
      categoryId: "food",
    });
  });

  it("leaves non-configured fields unchanged", () => {
    const slice = applyDateGranularityToSlice(
      { date: "2026-06-02T14:30:00.000Z" },
      ["date"],
      {},
    );

    expect(slice).toEqual({ date: "2026-06-02T14:30:00.000Z" });
  });
});

describe("applyDateGranularityToQuerySlice", () => {
  it("normalizes binding values for lookup", () => {
    const slice = applyDateGranularityToQuerySlice(
      { date: "2026-06-02T14:30:00.000Z" },
      ["date"],
      { date: "month" },
    );

    expect(slice).toEqual({ date: "2026-06" });
  });
});
