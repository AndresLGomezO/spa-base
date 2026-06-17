import { describe, expect, it } from "vitest";

import {
  buildPaletteColorOptions,
  buildSemanticColorOptions,
  buildUiBuilderColorCatalog,
  SHADOW_TOKEN_OPTIONS,
} from "./ui-builder-style-token-catalog.js";

describe("ui-builder-style-token-catalog", () => {
  it("includes extended semantic colors", () => {
    const values = new Set(
      buildSemanticColorOptions().map((option) => option.value),
    );
    expect(values.has("var(--color-destructive)")).toBe(true);
    expect(values.has("var(--color-text-secondary)")).toBe(true);
    expect(values.has("var(--color-border-muted)")).toBe(true);
  });

  it("includes full palette scales", () => {
    expect(buildPaletteColorOptions().length).toBe(55);
  });

  it("deduplicates the combined color catalog", () => {
    const catalog = buildUiBuilderColorCatalog();
    const values = catalog.map((option) => option.value);
    expect(new Set(values).size).toBe(values.length);
  });

  it("includes shadow shortcuts", () => {
    expect(SHADOW_TOKEN_OPTIONS).toEqual([
      { label: "None", value: "none" },
      { label: "Card", value: "card" },
    ]);
  });
});
