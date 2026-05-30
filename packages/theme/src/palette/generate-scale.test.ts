import { describe, expect, it } from "vitest";

import { DEFAULT_PRIMARY_SCALE } from "./default-scales.js";
import {
  expandAppearancePalettes,
  generateColorScale,
  inferPaletteFromLegacyColors,
  normalizeHexColor,
} from "./generate-scale.js";

describe("generateColorScale", () => {
  it("keeps the anchor step at the exact user color", () => {
    const scale = generateColorScale({
      anchorColor: "#ff0000",
      anchorStep: "500",
      referenceScale: DEFAULT_PRIMARY_SCALE,
    });

    expect(scale["500"]).toBe("#ff0000");
    expect(scale["50"]).not.toBe(scale["500"]);
    expect(scale["950"]).not.toBe(scale["500"]);
  });

  it("generates lighter and darker steps from a mid anchor", () => {
    const scale = generateColorScale({
      anchorColor: "#336699",
      anchorStep: "600",
      referenceScale: DEFAULT_PRIMARY_SCALE,
    });

    expect(scale["600"]).toBe("#336699");
    expect(scale["50"]).toMatch(/^#[0-9a-f]{6}$/);
    expect(scale["950"]).toMatch(/^#[0-9a-f]{6}$/);
  });

  it("generates from a light anchor step", () => {
    const scale = generateColorScale({
      anchorColor: "#eef6ff",
      anchorStep: "200",
      referenceScale: DEFAULT_PRIMARY_SCALE,
    });

    expect(scale["200"]).toBe("#eef6ff");
    expect(scale["950"]).not.toBe("#eef6ff");
  });

  it("merges manual shade overrides on top of generated values", () => {
    const scale = generateColorScale({
      anchorColor: "#ff0000",
      anchorStep: "500",
      referenceScale: DEFAULT_PRIMARY_SCALE,
      shadeOverrides: {
        "700": "#111111",
      },
    });

    expect(scale["500"]).toBe("#ff0000");
    expect(scale["700"]).toBe("#111111");
  });

  it("normalizes hex colors to lowercase", () => {
    expect(normalizeHexColor("#ABCDEF")).toBe("#abcdef");
  });
});

describe("inferPaletteFromLegacyColors", () => {
  it("infers anchor at 500 when legacy primary overrides exist", () => {
    const palette = inferPaletteFromLegacyColors("primary", {
      "--color-primary-500": "#112233",
      "--color-primary-600": "#223344",
      "--color-primary-700": "#334455",
    });

    expect(palette).toEqual({
      anchorStep: "500",
      anchorColor: "#112233",
      shadeOverrides: {
        "500": "#112233",
        "600": "#223344",
        "700": "#334455",
      },
    });
  });
});

describe("expandAppearancePalettes", () => {
  it("expands structured palettes and ignores legacy palette keys in colors", () => {
    const vars = expandAppearancePalettes({
      palettes: {
        primary: {
          anchorStep: "500",
          anchorColor: "#ff0000",
        },
      },
      colors: {
        "--color-primary-500": "#000000",
        "--color-sidebar": "#fafafa",
      },
    });

    expect(vars["--color-primary-500"]).toBe("#ff0000");
    expect(vars["--color-sidebar"]).toBe("#fafafa");
  });
});
