import { describe, expect, it } from "vitest";

import { buildPageWindow, totalPagesFromCount } from "./build-page-window";

describe("buildPageWindow", () => {
  it("returns single page when total is 1", () => {
    expect(buildPageWindow(1, 1)).toEqual([1]);
  });

  it("includes first, last, and siblings with ellipsis", () => {
    expect(buildPageWindow(5, 10, 1)).toEqual([
      1,
      "ellipsis",
      4,
      5,
      6,
      "ellipsis",
      10,
    ]);
  });

  it("omits ellipsis when pages are contiguous", () => {
    expect(buildPageWindow(2, 4, 1)).toEqual([1, 2, 3, 4]);
  });
});

describe("totalPagesFromCount", () => {
  it("computes pages from count and size", () => {
    expect(totalPagesFromCount(41, 20)).toBe(3);
    expect(totalPagesFromCount(0, 20)).toBe(0);
  });
});
