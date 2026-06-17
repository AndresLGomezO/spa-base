import {
  isCssBackgroundFillValue,
  isCssColorValue,
  isCssGradientBackgroundValue,
  isThemeTokenValue,
} from "./color-values.js";
import type { ThemeToken } from "./style-types.js";
import {
  themeTokenBackgroundClass,
  themeTokenTextClass,
} from "./theme-token-classes.js";

export interface ResolvedBackgroundColor {
  readonly className?: string;
  readonly backgroundColor?: string;
  readonly background?: string;
}

export interface ResolvedBackgroundInlineStyle {
  readonly backgroundColor?: string;
  readonly background?: string;
}

export function resolvedBackgroundInlineStyle(
  resolved: ResolvedBackgroundColor,
): ResolvedBackgroundInlineStyle | undefined {
  if (resolved.background) {
    return { background: resolved.background };
  }
  if (resolved.backgroundColor) {
    return { backgroundColor: resolved.backgroundColor };
  }
  return undefined;
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

  if (isCssBackgroundFillValue(value)) {
    const trimmed = value.trim();
    if (isCssGradientBackgroundValue(trimmed)) {
      return { background: trimmed };
    }
    return { backgroundColor: trimmed };
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

  if (isCssColorValue(value) && !isCssGradientBackgroundValue(value)) {
    return { color: value.trim() };
  }

  return {};
}
