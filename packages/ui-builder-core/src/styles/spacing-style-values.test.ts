import { describe, expect, it } from "vitest";

import {
  isMarginStyleProperty,
  NEGATIVE_MARGIN_MIN_PX,
  parseMarginPx,
  parseNonNegativeSpacingPx,
} from "./spacing-style-values.js";

describe("spacing-style-values", () => {
  it("identifies margin style properties", () => {
    expect(isMarginStyleProperty("marginTop")).toBe(true);
    expect(isMarginStyleProperty("paddingTop")).toBe(false);
  });

  it("parses signed margin pixel values", () => {
    expect(parseMarginPx("-40")).toBe(-40);
    expect(parseMarginPx("16")).toBe(16);
    expect(parseMarginPx("0")).toBe(0);
    expect(parseMarginPx("abc")).toBeUndefined();
    expect(parseMarginPx(String(NEGATIVE_MARGIN_MIN_PX - 1))).toBe(
      NEGATIVE_MARGIN_MIN_PX,
    );
  });

  it("rejects negative padding values", () => {
    expect(parseNonNegativeSpacingPx("-4")).toBeUndefined();
    expect(parseNonNegativeSpacingPx("8")).toBe(8);
  });
});
