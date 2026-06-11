import { describe, expect, it } from "vitest";

import {
  areComponentColumnRefsEqual,
  componentColumnRefKey,
} from "./form-designer-component-column-ref";

describe("componentColumnRefKey", () => {
  it("matches nested column refs with stable keys", () => {
    const left = {
      rootColumnIndex: 0,
      nestedParentRowId: "nested-1",
      nestedColumnIndex: 1,
    };
    const right = {
      rootColumnIndex: 0,
      nestedParentRowId: "nested-1",
      nestedColumnIndex: 1,
    };

    expect(componentColumnRefKey(left)).toBe("0:nested-1:1");
    expect(areComponentColumnRefsEqual(left, right)).toBe(true);
  });

  it("matches root column refs without nested fields", () => {
    expect(
      areComponentColumnRefsEqual(
        { rootColumnIndex: 2 },
        { rootColumnIndex: 2 },
      ),
    ).toBe(true);
    expect(
      areComponentColumnRefsEqual(
        { rootColumnIndex: 2 },
        { rootColumnIndex: 1 },
      ),
    ).toBe(false);
  });
});
