import { describe, expect, it } from "vitest";

import { shouldSeedProductSnapshotStatement } from "./seed-rates-documents.js";

describe("shouldSeedProductSnapshotStatement", () => {
  it("is deterministic for a given snapshot id", () => {
    expect(shouldSeedProductSnapshotStatement("tu1_snap_01")).toBe(
      shouldSeedProductSnapshotStatement("tu1_snap_01"),
    );
  });

  it("includes statements on a subset of snapshots, not all", () => {
    const snapshotIds = Array.from(
      { length: 12 },
      (_, index) => `tu1_snap_${String(index + 1).padStart(2, "0")}`,
    );
    const withStatement = snapshotIds.filter(
      shouldSeedProductSnapshotStatement,
    );

    expect(withStatement.length).toBeGreaterThan(0);
    expect(withStatement.length).toBeLessThan(snapshotIds.length);
  });
});
