import { describe, expect, it } from "vitest";

import {
  areComponentRowRefsEqual,
  toComponentRowRef,
} from "./form-designer-component-row-ref";

describe("form-designer-component-row-ref", () => {
  it("compares row refs by row id and locator", () => {
    const left = toComponentRowRef("row-1", {
      scope: "root",
      columnIndex: 0,
    });
    const right = toComponentRowRef("row-1", {
      scope: "root",
      columnIndex: 0,
    });
    const different = toComponentRowRef("row-2", {
      scope: "root",
      columnIndex: 0,
    });

    expect(areComponentRowRefsEqual(left, right)).toBe(true);
    expect(areComponentRowRefsEqual(left, different)).toBe(false);
    expect(areComponentRowRefsEqual(left, null)).toBe(false);
  });
});
