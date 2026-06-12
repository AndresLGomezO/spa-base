import { isCssColorValue, isThemeTokenValue } from "./color-values.js";
import type { ThemeToken } from "./style-types.js";
import {
  themeTokenBackgroundClass,
  themeTokenTextClass,
} from "./theme-token-classes.js";

export interface ResolvedBackgroundColor {
  readonly className?: string;
  readonly backgroundColor?: string;
}

export interface ResolvedTextColor {
  readonly className?: string;
  readonly color?: string;
}

export function resolveBackgroundComponentColor(
  value: string | undefined,
): ResolvedBackgroundColor {
  if (!value) {
    return {};
  }

  if (isThemeTokenValue(value)) {
    return { className: themeTokenBackgroundClass(value as ThemeToken) };
  }

  if (isCssColorValue(value)) {
    return { backgroundColor: value.trim() };
  }

  return {};
}

export function resolveTextComponentColor(
  value: string | undefined,
): ResolvedTextColor {
  if (!value) {
    return {};
  }

  if (isThemeTokenValue(value)) {
    return { className: themeTokenTextClass(value) };
  }

  if (isCssColorValue(value)) {
    return { color: value.trim() };
  }

  return {};
}
