import { describe, expect, it } from "vitest";

import {
  isCssBackdropFilterValue,
  isCssBoxShadowValue,
  isCssFontFamilyValue,
  isCssLengthTokenValue,
  resolveBoxLengthStyleValue,
  resolveLengthStyleValue,
} from "./css-values.js";

describe("css-values", () => {
  it("accepts theme length tokens", () => {
    expect(isCssLengthTokenValue("var(--radius-lg)")).toBe(true);
    expect(isCssLengthTokenValue("var(--spacing-macro)")).toBe(true);
    expect(isCssLengthTokenValue("var(--text-body)")).toBe(true);
    expect(isCssLengthTokenValue("var(--sidebar-width)")).toBe(true);
    expect(isCssLengthTokenValue("var(--color-primary)")).toBe(false);
  });

  it("resolves length values as px or css vars", () => {
    expect(resolveLengthStyleValue("12")).toBe("12px");
    expect(resolveLengthStyleValue("var(--radius-lg)")).toBe(
      "var(--radius-lg)",
    );
  });

  it("resolves box length values with percent and auto", () => {
    expect(resolveBoxLengthStyleValue("100%")).toBe("100%");
    expect(resolveBoxLengthStyleValue("auto")).toBe("auto");
    expect(resolveBoxLengthStyleValue("0")).toBe("0px");
    expect(resolveBoxLengthStyleValue("420")).toBe("420px");
  });

  it("accepts backdrop filter values", () => {
    expect(isCssBackdropFilterValue("blur(8px)")).toBe(true);
    expect(isCssBackdropFilterValue("var(--backdrop-blur)")).toBe(true);
    expect(isCssBackdropFilterValue("invalid")).toBe(false);
  });

  it("accepts shadow values", () => {
    expect(isCssBoxShadowValue("none")).toBe(true);
    expect(isCssBoxShadowValue("var(--shadow-card)")).toBe(true);
    expect(isCssBoxShadowValue("0px 4px 20px rgba(0, 0, 0, 0.08)")).toBe(true);
  });

  it("accepts font family values", () => {
    expect(isCssFontFamilyValue("var(--font-sans)")).toBe(true);
    expect(isCssFontFamilyValue("Inter, sans-serif")).toBe(true);
  });
});
