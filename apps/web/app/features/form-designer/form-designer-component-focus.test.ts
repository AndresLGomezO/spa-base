import { describe, expect, it } from "vitest";

import {
  columnBelongsToRow,
  rootColumnContainsColumnFocus,
  rowBelongsToColumn,
  rowContainsFocus,
  rowContainsRowFocus,
  rowFocusBelongsToColumn,
  rowIsWithinFocusedColumn,
} from "./form-designer-component-focus";

const nestedLayoutRowRef = {
  rowId: "nested-1",
  locator: { scope: "root" as const, columnIndex: 0 },
};

const nestedLayoutRowAtNestedScope = {
  rowId: "nested-inner",
  locator: {
    scope: "nested" as const,
    columnIndex: 0,
    rowId: "nested-outer",
    nestedColumnIndex: 1,
  },
};

const innerComponentRowRef = {
  rowId: "component-1",
  locator: {
    scope: "nested" as const,
    columnIndex: 0,
    rowId: "nested-1",
    nestedColumnIndex: 1,
  },
};

const nestedColumnRef = {
  rootColumnIndex: 0,
  nestedParentRowId: "nested-1",
  nestedColumnIndex: 1,
};

describe("form-designer-component-focus", () => {
  it("matches nested columns to their parent nested-layout row", () => {
    expect(columnBelongsToRow(nestedColumnRef, nestedLayoutRowRef)).toBe(true);
    expect(
      columnBelongsToRow(nestedColumnRef, nestedLayoutRowAtNestedScope),
    ).toBe(false);
  });

  it("treats nested-layout rows as containing descendant row focus", () => {
    expect(rowContainsRowFocus(innerComponentRowRef, nestedLayoutRowRef)).toBe(
      true,
    );
    expect(
      rowContainsRowFocus(innerComponentRowRef, innerComponentRowRef),
    ).toBe(true);
  });

  it("combines row and column containment", () => {
    expect(rowContainsFocus(null, nestedColumnRef, nestedLayoutRowRef)).toBe(
      true,
    );
    expect(
      rowContainsFocus(innerComponentRowRef, null, nestedLayoutRowRef),
    ).toBe(true);
    expect(
      rowContainsFocus(
        innerComponentRowRef,
        nestedColumnRef,
        nestedLayoutRowRef,
      ),
    ).toBe(true);
  });

  it("maps focused rows to their nested column", () => {
    expect(rowFocusBelongsToColumn(innerComponentRowRef, nestedColumnRef)).toBe(
      true,
    );
    expect(
      rowFocusBelongsToColumn(innerComponentRowRef, {
        rootColumnIndex: 0,
        nestedParentRowId: "nested-1",
        nestedColumnIndex: 0,
      }),
    ).toBe(false);
  });

  it("treats root columns as containing descendant nested column focus", () => {
    expect(
      rootColumnContainsColumnFocus({ rootColumnIndex: 0 }, nestedColumnRef),
    ).toBe(true);
    expect(
      rootColumnContainsColumnFocus({ rootColumnIndex: 1 }, nestedColumnRef),
    ).toBe(false);
    expect(
      rootColumnContainsColumnFocus(nestedColumnRef, nestedColumnRef),
    ).toBe(false);
  });

  it("keeps rows inside the focused column from dimming", () => {
    expect(rowBelongsToColumn(nestedColumnRef, innerComponentRowRef)).toBe(
      true,
    );
    expect(
      rowIsWithinFocusedColumn(nestedColumnRef, innerComponentRowRef),
    ).toBe(true);
    expect(
      rowIsWithinFocusedColumn(nestedColumnRef, {
        rowId: "component-2",
        locator: {
          scope: "nested",
          columnIndex: 0,
          rowId: "nested-1",
          nestedColumnIndex: 0,
        },
      }),
    ).toBe(false);
  });
});
