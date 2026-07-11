import type { StylePropertyKey } from "./style-types.js";

/** Lower bound for signed length style values in the builder (px). */
export const NEGATIVE_LENGTH_MIN_PX = -999;

/** @deprecated Prefer {@link NEGATIVE_LENGTH_MIN_PX}. */
export const NEGATIVE_MARGIN_MIN_PX = NEGATIVE_LENGTH_MIN_PX;

const MARGIN_STYLE_PROPERTIES = new Set<StylePropertyKey>([
  "marginTop",
  "marginBottom",
  "marginLeft",
  "marginRight",
]);

const INSET_STYLE_PROPERTIES = new Set<StylePropertyKey>([
  "top",
  "right",
  "bottom",
  "left",
]);

export function isMarginStyleProperty(property: StylePropertyKey): boolean {
  return MARGIN_STYLE_PROPERTIES.has(property);
}

export function isInsetStyleProperty(property: StylePropertyKey): boolean {
  return INSET_STYLE_PROPERTIES.has(property);
}

/** Margins and inset offsets (top/right/bottom/left) accept negative px. */
export function allowsNegativeLengthStyleProperty(
  property: StylePropertyKey,
): boolean {
  return isMarginStyleProperty(property) || isInsetStyleProperty(property);
}

export function parseSignedLengthPx(value: string): number | undefined {
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return undefined;
  }

  const parsed = Number.parseInt(trimmed, 10);
  if (!Number.isFinite(parsed)) {
    return undefined;
  }

  return Math.max(NEGATIVE_LENGTH_MIN_PX, parsed);
}

/** @deprecated Prefer {@link parseSignedLengthPx}. */
export function parseMarginPx(value: string): number | undefined {
  return parseSignedLengthPx(value);
}

export function parseNonNegativeSpacingPx(value: string): number | undefined {
  const parsed = Number.parseInt(String(value).trim(), 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined;
}
