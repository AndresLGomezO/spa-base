import { describe, expect, it } from "vitest";

import { normalizeFirestoreTimestamps } from "./timestamps.js";

describe("normalizeFirestoreTimestamps", () => {
  it("converts Timestamp-like objects with toDate", () => {
    const iso = normalizeFirestoreTimestamps({
      createdAt: {
        toDate: () => new Date("2025-01-01T00:00:00.000Z"),
      },
    });

    expect(iso).toEqual({
      createdAt: "2025-01-01T00:00:00.000Z",
    });
  });

  it("converts seconds/nanoseconds timestamp shapes", () => {
    const converted = normalizeFirestoreTimestamps({
      nested: {
        updatedAt: {
          seconds: 1_735_689_600,
          nanoseconds: 0,
        },
      },
    });

    expect(converted).toEqual({
      nested: {
        updatedAt: "2025-01-01T00:00:00.000Z",
      },
    });
  });
});
