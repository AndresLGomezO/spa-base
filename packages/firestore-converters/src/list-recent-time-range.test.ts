import { describe, expect, it } from "vitest";

import { isIsoWithinTimeRange } from "./list-recent-time-range.js";

describe("isIsoWithinTimeRange", () => {
  it("allows all values when no bounds are set", () => {
    expect(isIsoWithinTimeRange("2026-07-23T12:00:00.000Z")).toBe(true);
  });

  it("enforces since and until inclusive bounds", () => {
    expect(
      isIsoWithinTimeRange("2026-07-23T12:00:00.000Z", {
        since: "2026-07-23T11:00:00.000Z",
        until: "2026-07-23T13:00:00.000Z",
      }),
    ).toBe(true);
    expect(
      isIsoWithinTimeRange("2026-07-23T10:00:00.000Z", {
        since: "2026-07-23T11:00:00.000Z",
      }),
    ).toBe(false);
    expect(
      isIsoWithinTimeRange("2026-07-23T14:00:00.000Z", {
        until: "2026-07-23T13:00:00.000Z",
      }),
    ).toBe(false);
  });
});
