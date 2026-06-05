import { describe, expect, it } from "vitest";

import { isCssColorValue, isThemeTokenValue } from "./color-values.js";

describe("color value helpers", () => {
  it("recognizes theme tokens", () => {
    expect(isThemeTokenValue("primary")).toBe(true);
    expect(isThemeTokenValue("#primary")).toBe(false);
  });

  it("recognizes css color literals", () => {
    expect(isCssColorValue("#fff")).toBe(true);
    expect(isCssColorValue("#aabbcc")).toBe(true);
    expect(isCssColorValue("rgb(0, 0, 0)")).toBe(true);
    expect(isCssColorValue("hsl(200 50% 50%)")).toBe(true);
    expect(isCssColorValue("primary")).toBe(false);
  });
});
