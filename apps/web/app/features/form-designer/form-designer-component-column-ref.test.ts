import { describe, expect, it } from "vitest";

import {
  parseLayoutColumnIdAttr,
  toLayoutColumnIdAttr,
} from "./form-designer-component-column-ref";

describe("layout column id attr", () => {
  it("round-trips root column refs", () => {
    const ref = { rootColumnIndex: 2 };
    expect(toLayoutColumnIdAttr(ref)).toBe("2");
    expect(parseLayoutColumnIdAttr("2")).toEqual(ref);
  });

  it("round-trips nested column refs", () => {
    const ref = {
      rootColumnIndex: 0,
      nestedParentRowId: "row-grid",
      nestedColumnIndex: 1,
    };
    expect(toLayoutColumnIdAttr(ref)).toBe("0:row-grid:1");
    expect(parseLayoutColumnIdAttr("0:row-grid:1")).toEqual(ref);
  });

  it("returns null for invalid attrs", () => {
    expect(parseLayoutColumnIdAttr("")).toBeNull();
    expect(parseLayoutColumnIdAttr("a:b")).toBeNull();
    expect(parseLayoutColumnIdAttr("x")).toBeNull();
  });
});
