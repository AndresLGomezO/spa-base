import { describe, expect, it } from "vitest";

import {
  buildMetricDocId,
  buildMetricRowKey,
  resolveMetricOwnerId,
} from "./metric-doc-id.js";

describe("buildMetricDocId", () => {
  it("returns the same id for the same input", () => {
    const first = buildMetricDocId(
      "user_a",
      { month: "2026-06" },
      { category: "food" },
    );
    const second = buildMetricDocId(
      "user_a",
      { month: "2026-06" },
      { category: "food" },
    );
    expect(first).toBe(second);
  });

  it("returns the same id when dimension key order differs in input objects", () => {
    const first = buildMetricDocId("user_a", {}, { a: "1", b: "2" });
    const second = buildMetricDocId("user_a", {}, { b: "2", a: "1" });
    expect(first).toBe(second);
  });

  it("returns different ids for different users", () => {
    const userA = buildMetricDocId("user_a", {}, {});
    const userB = buildMetricDocId("user_b", {}, {});
    expect(userA).not.toBe(userB);
  });
});

describe("buildMetricRowKey", () => {
  it("includes docId consistent with buildMetricDocId", () => {
    const rowKey = buildMetricRowKey({
      userId: "user_a",
      group: { month: "2026-06" },
      dimensions: {},
    });
    expect(rowKey.docId).toBe(
      buildMetricDocId("user_a", { month: "2026-06" }, {}),
    );
  });
});

describe("resolveMetricOwnerId", () => {
  it("returns trimmed ownerId", () => {
    expect(resolveMetricOwnerId({ ownerId: "  user_1  " })).toBe("user_1");
  });

  it("returns null when ownerId is missing or blank", () => {
    expect(resolveMetricOwnerId({})).toBeNull();
    expect(resolveMetricOwnerId({ ownerId: "" })).toBeNull();
    expect(resolveMetricOwnerId({ ownerId: "   " })).toBeNull();
  });
});
