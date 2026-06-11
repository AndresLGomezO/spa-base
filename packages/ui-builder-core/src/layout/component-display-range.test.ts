import { describe, expect, it } from "vitest";

import {
  buildDisplayRangeClassName,
  isFullDisplayRange,
  isVisibleAtBreakpoint,
  normalizeDisplayRange,
} from "./component-display-range.js";

describe("normalizeDisplayRange", () => {
  it("defaults omitted values to base through xl", () => {
    expect(normalizeDisplayRange()).toEqual({ from: "base", to: "xl" });
  });

  it("swaps inverted ranges", () => {
    expect(normalizeDisplayRange("lg", "sm")).toEqual({ from: "sm", to: "lg" });
  });
});

describe("isFullDisplayRange", () => {
  it("returns true when both fields are omitted", () => {
    expect(isFullDisplayRange()).toBe(true);
  });

  it("returns false for a restricted range", () => {
    expect(isFullDisplayRange("md", "xl")).toBe(false);
  });
});

describe("buildDisplayRangeClassName", () => {
  it("returns undefined for all screens", () => {
    expect(buildDisplayRangeClassName()).toBeUndefined();
    expect(buildDisplayRangeClassName("base", "xl")).toBeUndefined();
  });

  it("builds tablet and up classes", () => {
    expect(buildDisplayRangeClassName("md", "xl")).toBe("hidden md:flex");
  });

  it("builds mobile through medium only", () => {
    expect(buildDisplayRangeClassName("base", "md")).toBe("lg:hidden");
  });

  it("builds middle band classes", () => {
    expect(buildDisplayRangeClassName("sm", "lg")).toBe(
      "hidden sm:flex xl:hidden",
    );
  });

  it("builds mobile-only classes", () => {
    expect(buildDisplayRangeClassName("base", "base")).toBe("sm:hidden");
  });

  it("supports block display mode", () => {
    expect(buildDisplayRangeClassName("md", "xl", { display: "block" })).toBe(
      "hidden md:block",
    );
  });
});

describe("isVisibleAtBreakpoint", () => {
  it("shows on all breakpoints when range is full", () => {
    expect(isVisibleAtBreakpoint(undefined, undefined, "base")).toBe(true);
    expect(isVisibleAtBreakpoint(undefined, undefined, "xl")).toBe(true);
  });

  it("restricts to md through xl", () => {
    expect(isVisibleAtBreakpoint("md", "xl", "base")).toBe(false);
    expect(isVisibleAtBreakpoint("md", "xl", "md")).toBe(true);
    expect(isVisibleAtBreakpoint("md", "xl", "xl")).toBe(true);
  });

  it("restricts to mobile only", () => {
    expect(isVisibleAtBreakpoint("base", "base", "base")).toBe(true);
    expect(isVisibleAtBreakpoint("base", "base", "sm")).toBe(false);
  });
});
