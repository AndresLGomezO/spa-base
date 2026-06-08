import { describe, expect, it } from "vitest";

import {
  isCssColorValue,
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
});
