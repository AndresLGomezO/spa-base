import { describe, expect, it } from "vitest";

import {
  isCssBackgroundFillValue,
  isCssColorValue,
  isCssGradientBackgroundValue,
  isCustomBackgroundFillValue,
  isCustomColorValue,
  isThemeTokenValue,
} from "./color-values.js";

describe("color-values", () => {
  it("accepts semantic css variable references", () => {
    expect(isCssColorValue("var(--color-primary)")).toBe(true);
    expect(isCustomColorValue("var(--color-muted-foreground)")).toBe(true);
    expect(isThemeTokenValue("var(--color-primary)")).toBe(false);
  });

  it("rejects malformed css variable references", () => {
    expect(isCssColorValue("var(color-primary)")).toBe(false);
    expect(isCssColorValue("var(--color-primary, #fff)")).toBe(false);
  });

  it("accepts gradient backgrounds and css gradient variables", () => {
    expect(
      isCssGradientBackgroundValue(
        "linear-gradient(135deg, #8c6fe6 0%, #553cd9 100%)",
      ),
    ).toBe(true);
    expect(isCssGradientBackgroundValue("var(--gradient-primary)")).toBe(true);
    expect(isCssBackgroundFillValue("var(--gradient-primary)")).toBe(true);
    expect(isCustomBackgroundFillValue("var(--gradient-primary)")).toBe(true);
  });

  it("accepts color-mix expressions with semantic css variables", () => {
    const tint =
      "color-mix(in oklch, var(--color-destructive) 14%, transparent)";
    expect(isCssColorValue(tint)).toBe(true);
    expect(isCssBackgroundFillValue(tint)).toBe(true);
    expect(isCustomColorValue(tint)).toBe(true);
    expect(isCustomBackgroundFillValue(tint)).toBe(true);
  });

  it("rejects malformed color-mix expressions", () => {
    expect(isCssColorValue("color-mix(in oklch, #fff")).toBe(false);
    expect(isCssColorValue("not-color-mix(#fff, #000)")).toBe(false);
  });
});
