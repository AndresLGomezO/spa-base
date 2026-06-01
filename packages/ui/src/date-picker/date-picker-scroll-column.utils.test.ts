import { describe, expect, it } from "vitest";

import {
  getAdjacentIndex,
  getIndexFromScrollTop,
  getScrollTopForIndex,
  SCROLL_COLUMN_ITEM_HEIGHT,
  SCROLL_COLUMN_PADDING,
  SCROLL_COLUMN_VIEWPORT_HEIGHT,
} from "./date-picker-scroll-column.utils.js";

describe("date-picker-scroll-column.utils", () => {
  it("maps index to scroll top", () => {
    expect(getScrollTopForIndex(0)).toBe(0);
    expect(getScrollTopForIndex(5)).toBe(160);
  });

  it("maps scroll top to nearest index", () => {
    expect(getIndexFromScrollTop(0, 12)).toBe(0);
    expect(getIndexFromScrollTop(64, 12)).toBe(2);
    expect(getIndexFromScrollTop(999, 12)).toBe(11);
  });

  it("clamps adjacent index within bounds", () => {
    expect(getAdjacentIndex(0, -1, 12)).toBe(0);
    expect(getAdjacentIndex(5, 1, 12)).toBe(6);
    expect(getAdjacentIndex(11, 1, 12)).toBe(11);
  });

  it("centers items in the viewport", () => {
    expect(SCROLL_COLUMN_PADDING).toBe(
      (SCROLL_COLUMN_VIEWPORT_HEIGHT - SCROLL_COLUMN_ITEM_HEIGHT) / 2,
    );
  });
});
