import type { StylePropertyKey } from "./style-types.js";

/** Lower bound for margin style values in the builder (px). */
export const NEGATIVE_MARGIN_MIN_PX = -999;

const MARGIN_STYLE_PROPERTIES = new Set<StylePropertyKey>([
  "marginTop",
  "marginBottom",
  "marginLeft",
  "marginRight",
]);

export function isMarginStyleProperty(property: StylePropertyKey): boolean {
  return MARGIN_STYLE_PROPERTIES.has(property);
}

export function parseMarginPx(value: string): number | undefined {
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return undefined;
  }

  const parsed = Number.parseInt(trimmed, 10);
  if (!Number.isFinite(parsed)) {
    return undefined;
  }

  return Math.max(NEGATIVE_MARGIN_MIN_PX, parsed);
}

export function parseNonNegativeSpacingPx(value: string): number | undefined {
  const parsed = Number.parseInt(String(value).trim(), 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined;
}
