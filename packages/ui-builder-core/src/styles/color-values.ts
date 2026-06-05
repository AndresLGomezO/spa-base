import type { ThemeToken } from "./style-types.js";

const THEME_TOKENS = new Set<string>([
  "default",
  "muted",
  "primary",
  "success",
  "warning",
  "danger",
  "info",
  "background",
  "foreground",
  "transparent",
]);

export function isThemeTokenValue(value: string): value is ThemeToken {
  return THEME_TOKENS.has(value);
}

/** Accepts #rgb, #rrggbb, #rrggbbaa, rgb(), rgba(), hsl(), hsla(). */
export function isCssColorValue(value: string): boolean {
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return false;
  }

  if (/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/.test(trimmed)) {
    return true;
  }

  return /^(rgb|rgba|hsl|hsla)\(/i.test(trimmed);
}

export function isCustomColorValue(value: string): boolean {
  return !isThemeTokenValue(value) && isCssColorValue(value);
}
