import type { ColorScaleStep } from "./scale-steps.js";

/** Default primary scale from tokens.css */
export const DEFAULT_PRIMARY_SCALE: Record<ColorScaleStep, string> = {
  "50": "#eff9ff",
  "100": "#def2ff",
  "200": "#b6e8ff",
  "300": "#75d8ff",
  "400": "#2cc5ff",
  "500": "#00a1e5",
  "600": "#008bd4",
  "700": "#006eab",
  "800": "#005d8d",
  "900": "#064d74",
  "950": "#04314d",
};

/** Default neutral scale from tokens.css */
export const DEFAULT_NEUTRAL_SCALE: Record<ColorScaleStep, string> = {
  "50": "#f7f7f8",
  "100": "#ededf1",
  "200": "#d7d8e0",
  "300": "#b5b6c4",
  "400": "#8c8ea4",
  "500": "#6e7189",
  "600": "#595a70",
  "700": "#48495c",
  "800": "#3e3e4e",
  "900": "#373843",
  "950": "#18181b",
};

export type PaletteKind = "primary" | "neutral";

export function getDefaultReferenceScale(
  kind: PaletteKind,
): Record<ColorScaleStep, string> {
  return kind === "primary" ? DEFAULT_PRIMARY_SCALE : DEFAULT_NEUTRAL_SCALE;
}
