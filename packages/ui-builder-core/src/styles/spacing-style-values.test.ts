import { describe, expect, it } from "vitest";

import {
  allowsNegativeLengthStyleProperty,
  isInsetStyleProperty,
  isMarginStyleProperty,
  NEGATIVE_LENGTH_MIN_PX,
  parseNonNegativeSpacingPx,
  parseSignedLengthPx,
} from "./spacing-style-values.js";

describe("spacing-style-values", () => {
  it("identifies margin and inset style properties", () => {
    expect(isMarginStyleProperty("marginTop")).toBe(true);
    expect(isMarginStyleProperty("paddingTop")).toBe(false);
    expect(isInsetStyleProperty("top")).toBe(true);
    expect(isInsetStyleProperty("left")).toBe(true);
    expect(isInsetStyleProperty("marginTop")).toBe(false);
    expect(allowsNegativeLengthStyleProperty("marginBottom")).toBe(true);
    expect(allowsNegativeLengthStyleProperty("bottom")).toBe(true);
    expect(allowsNegativeLengthStyleProperty("paddingTop")).toBe(false);
  });

  it("parses signed length pixel values for margins and insets", () => {
    expect(parseSignedLengthPx("-40")).toBe(-40);
    expect(parseSignedLengthPx("16")).toBe(16);
    expect(parseSignedLengthPx("0")).toBe(0);
    expect(parseSignedLengthPx("abc")).toBeUndefined();
    expect(parseSignedLengthPx(String(NEGATIVE_LENGTH_MIN_PX - 1))).toBe(
      NEGATIVE_LENGTH_MIN_PX,
    );
  });

  it("rejects negative padding values", () => {
    expect(parseNonNegativeSpacingPx("-4")).toBeUndefined();
    expect(parseNonNegativeSpacingPx("8")).toBe(8);
  });
});
