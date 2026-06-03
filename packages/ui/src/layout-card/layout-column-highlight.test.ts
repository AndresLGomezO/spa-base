import { describe, expect, it } from "vitest";

import {
  getLayoutColumnHighlightClass,
  resolveLayoutColumnIndex,
} from "./layout-column-highlight.js";

describe("layout-column-highlight", () => {
  it("resolves column index from tagged layout nodes", () => {
    expect(
      resolveLayoutColumnIndex(
        {
          id: "__col:2",
        },
        0,
      ),
    ).toBe(2);
  });

  it("returns progressively darker classes by depth", () => {
    const depth0 = getLayoutColumnHighlightClass(
      [{ depth: 0, columnIndex: 1 }],
      { depth: 0, columnIndex: 1 },
    );
    const depth1 = getLayoutColumnHighlightClass(
      [{ depth: 1, columnIndex: 0, gridId: "slot-1" }],
      { depth: 1, columnIndex: 0, gridId: "slot-1" },
    );

    expect(depth0).toContain("bg-muted/35");
    expect(depth1).toContain("bg-muted/55");
    expect(depth1).not.toBe(depth0);
  });

  it("matches inner grids by id", () => {
    expect(
      getLayoutColumnHighlightClass(
        [{ depth: 1, columnIndex: 0, gridId: "slot-1" }],
        { depth: 1, columnIndex: 0, gridId: "slot-2" },
      ),
    ).toBeUndefined();
  });
});
