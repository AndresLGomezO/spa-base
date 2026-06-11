import {
  createEmptyLayout,
  setRootColumnWidthPercent,
  updateRootColumnStyles,
} from "@repo/ui-builder-core";
import { describe, expect, it } from "vitest";

import {
  areLayoutSnapshotsEqual,
  readLayoutSnapshot,
} from "./form-designer-layout";
import { isColumnPanelDirty } from "./form-designer-column-panel-session";

describe("form-designer-column-panel-session", () => {
  it("detects dirty when layout differs from baseline", () => {
    const layout = createEmptyLayout(2);
    const baseline = readLayoutSnapshot(layout);
    const mutated = setRootColumnWidthPercent(layout, 0, 40);

    expect(isColumnPanelDirty(baseline, readLayoutSnapshot(mutated))).toBe(
      true,
    );
  });

  it("detects dirty when column styles differ from baseline", () => {
    const layout = createEmptyLayout(2);
    const baseline = readLayoutSnapshot(layout);
    const mutated = updateRootColumnStyles(layout, 0, [
      { property: "backgroundColor", value: "#ff0000" },
    ]);

    expect(isColumnPanelDirty(baseline, readLayoutSnapshot(mutated))).toBe(
      true,
    );
  });

  it("is clean when layout matches baseline", () => {
    const layout = createEmptyLayout(2);
    const baseline = readLayoutSnapshot(layout);

    expect(isColumnPanelDirty(baseline, readLayoutSnapshot(layout))).toBe(
      false,
    );
  });

  it("areLayoutSnapshotsEqual ignores reference equality", () => {
    const layout = createEmptyLayout(1);
    const a = readLayoutSnapshot(layout);
    const b = readLayoutSnapshot(layout);

    expect(a.layout).not.toBe(b.layout);
    expect(areLayoutSnapshotsEqual(a, b)).toBe(true);
  });
});
