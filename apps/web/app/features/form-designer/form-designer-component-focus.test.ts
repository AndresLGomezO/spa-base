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

const gridRowRef = {
  rowId: "grid-1",
  locator: { scope: "root" as const, columnIndex: 0 },
};

const gridTrackRowRef = {
  rowId: "track-1",
  locator: {
    scope: "container" as const,
    columnIndex: 0,
    containerRowId: "grid-1",
  },
};

const innerComponentRowRef = {
  rowId: "component-1",
  locator: {
    scope: "container" as const,
    columnIndex: 0,
    containerRowId: "track-1",
  },
};

const gridTrackColumnRef = {
  rootColumnIndex: 0,
  nestedParentRowId: "grid-1",
  nestedColumnIndex: 1,
};

describe("form-designer-component-focus", () => {
  it("matches grid track columns to their parent grid row", () => {
    expect(columnBelongsToRow(gridTrackColumnRef, gridRowRef)).toBe(true);
    expect(columnBelongsToRow(gridTrackColumnRef, gridTrackRowRef)).toBe(false);
  });

  it("treats grid rows as containing descendant row focus", () => {
    expect(rowContainsRowFocus(innerComponentRowRef, gridRowRef)).toBe(true);
    expect(rowContainsRowFocus(innerComponentRowRef, gridTrackRowRef)).toBe(
      true,
    );
    expect(
      rowContainsRowFocus(innerComponentRowRef, innerComponentRowRef),
    ).toBe(true);
  });

  it("combines row and column containment", () => {
    expect(rowContainsFocus(null, gridTrackColumnRef, gridRowRef)).toBe(true);
    expect(rowContainsFocus(innerComponentRowRef, null, gridRowRef)).toBe(true);
    expect(
      rowContainsFocus(innerComponentRowRef, gridTrackColumnRef, gridRowRef),
    ).toBe(true);
  });

  it("maps focused rows to their grid track column", () => {
    expect(
      rowFocusBelongsToColumn(innerComponentRowRef, gridTrackColumnRef),
    ).toBe(true);
    expect(
      rowFocusBelongsToColumn(innerComponentRowRef, {
        rootColumnIndex: 0,
        nestedParentRowId: "grid-1",
        nestedColumnIndex: 0,
      }),
    ).toBe(true);
  });

  it("treats root columns as containing descendant grid track column focus", () => {
    expect(
      rootColumnContainsColumnFocus({ rootColumnIndex: 0 }, gridTrackColumnRef),
    ).toBe(true);
    expect(
      rootColumnContainsColumnFocus({ rootColumnIndex: 1 }, gridTrackColumnRef),
    ).toBe(false);
    expect(
      rootColumnContainsColumnFocus(gridTrackColumnRef, gridTrackColumnRef),
    ).toBe(false);
  });

  it("keeps rows inside the focused column from dimming", () => {
    expect(rowBelongsToColumn(gridTrackColumnRef, innerComponentRowRef)).toBe(
      true,
    );
    expect(
      rowIsWithinFocusedColumn(gridTrackColumnRef, innerComponentRowRef),
    ).toBe(true);
    expect(
      rowIsWithinFocusedColumn(gridTrackColumnRef, {
        rowId: "component-2",
        locator: {
          scope: "container",
          columnIndex: 0,
          containerRowId: "track-2",
        },
      }),
    ).toBe(true);
  });
});
