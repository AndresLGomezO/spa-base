import { describe, expect, it } from "vitest";

import {
  resolveDarkSemanticsFromPalette,
  resolveLightSemanticsFromPalette,
} from "./resolve-from-palette.js";

const samplePalette = {
  "--color-neutral-50": "#f7f7f8",
  "--color-neutral-100": "#ececed",
  "--color-neutral-200": "#d9d9db",
  "--color-neutral-300": "#b8b8bc",
  "--color-neutral-400": "#919197",
  "--color-neutral-500": "#737379",
  "--color-neutral-600": "#5d5d63",
  "--color-neutral-700": "#4c4c51",
  "--color-neutral-800": "#414146",
  "--color-neutral-900": "#39393d",
  "--color-neutral-950": "#0e0e11",
  "--color-primary-400": "#33a3dd",
  "--color-primary-500": "#008bd4",
  "--color-primary-600": "#0070b0",
  "--color-primary-700": "#005a8f",
  "--color-primary-800": "#004a76",
};

describe("resolveLightSemanticsFromPalette", () => {
  it("maps foreground to neutral-950 and background to neutral-50", () => {
    const vars = resolveLightSemanticsFromPalette(samplePalette);
    expect(vars["--color-foreground"]).toBe("#0e0e11");
    expect(vars["--color-background"]).toBe("#f7f7f8");
  });
});

describe("resolveDarkSemanticsFromPalette", () => {
  it("maps foreground to neutral-50 and background to neutral-950", () => {
    const vars = resolveDarkSemanticsFromPalette(samplePalette);
    expect(vars["--color-foreground"]).toBe("#f7f7f8");
    expect(vars["--color-background"]).toBe("#0e0e11");
  });
});
