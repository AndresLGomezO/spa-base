import { describe, expect, it } from "vitest";

import { resolveTimeRangeBounds } from "./resolve-time-range-bounds.js";

describe("resolveTimeRangeBounds", () => {
  const now = new Date("2026-07-23T15:30:00.000Z");

  it("resolves relative presets from now", () => {
    expect(
      resolveTimeRangeBounds({ mode: "preset", preset: "5m" }, now, "UTC"),
    ).toEqual({
      sinceIso: "2026-07-23T15:25:00.000Z",
      untilIso: "2026-07-23T15:30:00.000Z",
    });

    expect(
      resolveTimeRangeBounds({ mode: "preset", preset: "15s" }, now, "UTC"),
    ).toEqual({
      sinceIso: "2026-07-23T15:29:45.000Z",
      untilIso: "2026-07-23T15:30:00.000Z",
    });

    expect(
      resolveTimeRangeBounds({ mode: "preset", preset: "1h" }, now, "UTC"),
    ).toEqual({
      sinceIso: "2026-07-23T14:30:00.000Z",
      untilIso: "2026-07-23T15:30:00.000Z",
    });
  });

  it("resolves today and yesterday in a fixed timezone", () => {
    // 15:30 UTC = 10:30 America/Bogota (UTC-5)
    const today = resolveTimeRangeBounds(
      { mode: "preset", preset: "today" },
      now,
      "America/Bogota",
    );
    expect(today.sinceIso).toBe("2026-07-23T05:00:00.000Z");
    expect(today.untilIso).toBe("2026-07-24T04:59:59.999Z");

    const yesterday = resolveTimeRangeBounds(
      { mode: "preset", preset: "yesterday" },
      now,
      "America/Bogota",
    );
    expect(yesterday.sinceIso).toBe("2026-07-22T05:00:00.000Z");
    expect(yesterday.untilIso).toBe("2026-07-23T04:59:59.999Z");
  });

  it("resolves custom ranges and swaps inverted bounds", () => {
    expect(
      resolveTimeRangeBounds(
        {
          mode: "custom",
          fromIso: "2026-07-23T10:00:00.000Z",
          toIso: "2026-07-23T12:00:00.000Z",
        },
        now,
        "UTC",
      ),
    ).toEqual({
      sinceIso: "2026-07-23T10:00:00.000Z",
      untilIso: "2026-07-23T12:00:00.000Z",
    });

    expect(
      resolveTimeRangeBounds(
        {
          mode: "custom",
          fromIso: "2026-07-23T12:00:00.000Z",
          toIso: "2026-07-23T10:00:00.000Z",
        },
        now,
        "UTC",
      ),
    ).toEqual({
      sinceIso: "2026-07-23T10:00:00.000Z",
      untilIso: "2026-07-23T12:00:00.000Z",
    });
  });

  it("resolves around a center timestamp", () => {
    expect(
      resolveTimeRangeBounds(
        {
          mode: "around",
          atIso: "2026-07-23T12:00:00.000Z",
          window: "5m",
        },
        now,
        "UTC",
      ),
    ).toEqual({
      sinceIso: "2026-07-23T11:55:00.000Z",
      untilIso: "2026-07-23T12:05:00.000Z",
    });
  });
});
