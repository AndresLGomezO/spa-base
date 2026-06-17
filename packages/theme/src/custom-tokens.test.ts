import { describe, expect, it } from "vitest";

import {
  applyCustomTokens,
  buildCustomTokenColorOptions,
  isReservedCustomTokenSlug,
  sanitizeCustomTokens,
} from "./custom-tokens.js";

describe("custom tokens", () => {
  it("applies scheme-specific color and gradient vars", () => {
    const tokens = sanitizeCustomTokens([
      {
        kind: "color",
        name: "widget",
        label: "Widget",
        light: "#ffffff",
        dark: "#111827",
      },
      {
        kind: "gradient",
        name: "hero",
        light: "linear-gradient(135deg, #fff 0%, #eee 100%)",
        dark: "linear-gradient(135deg, #111 0%, #000 100%)",
      },
    ]);

    const lightVars: Record<string, string> = {};
    applyCustomTokens(tokens, "light", lightVars);
    expect(lightVars["--color-widget"]).toBe("#ffffff");
    expect(lightVars["--gradient-hero"]).toContain("linear-gradient");

    const darkVars: Record<string, string> = {};
    applyCustomTokens(tokens, "dark", darkVars);
    expect(darkVars["--color-widget"]).toBe("#111827");
    expect(darkVars["--gradient-hero"]).toContain("#111");
  });

  it("rejects reserved and duplicate slugs", () => {
    expect(isReservedCustomTokenSlug("color", "primary")).toBe(true);
    expect(isReservedCustomTokenSlug("color", "primary-500")).toBe(true);
    expect(isReservedCustomTokenSlug("gradient", "primary")).toBe(true);
    expect(isReservedCustomTokenSlug("color", "widget")).toBe(false);

    const tokens = sanitizeCustomTokens([
      { kind: "color", name: "widget", light: "#ffffff" },
      { kind: "color", name: "widget", dark: "#000000" },
      { kind: "color", name: "primary", light: "#ffffff" },
    ]);

    expect(tokens).toHaveLength(1);
    expect(tokens[0]?.name).toBe("widget");
  });

  it("builds picker options from sanitized tokens", () => {
    const options = buildCustomTokenColorOptions([
      {
        kind: "color",
        name: "widget",
        label: "Widget surface",
        light: "#ffffff",
      },
    ]);

    expect(options).toEqual([
      { label: "Widget surface", value: "var(--color-widget)" },
    ]);
  });
});
