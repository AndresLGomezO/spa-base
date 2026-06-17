/** CSS value helpers for UI builder style rules (no @repo/theme dependency). */

/** Gradients must use the CSS `background` property, not `background-color`. */
export function isCssGradientBackgroundValue(value: string): boolean {
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return false;
  }

  if (
    /^(?:linear|radial|conic|repeating-linear|repeating-radial|repeating-conic)-gradient\(/i.test(
      trimmed,
    )
  ) {
    return true;
  }

  return /^var\(--gradient-[a-zA-Z0-9-]+\)$/.test(trimmed);
}

export function isCssBoxShadowValue(value: string): boolean {
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return false;
  }

  if (/^var\(--shadow-[a-zA-Z0-9-]+\)$/.test(trimmed)) {
    return true;
  }

  if (trimmed === "none") {
    return true;
  }

  return (
    /\d/.test(trimmed) && /(?:px|rem|em|%|rgba?|hsla?|var\()/i.test(trimmed)
  );
}

export function isCssLengthTokenValue(value: string): boolean {
  const trimmed = value.trim();
  return (
    /^var\(--(?:radius|spacing|text)-[a-zA-Z0-9-]+\)$/.test(trimmed) ||
    trimmed === "var(--sidebar-width)"
  );
}

export function isCssFontFamilyValue(value: string): boolean {
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return false;
  }

  if (trimmed === "var(--font-sans)") {
    return true;
  }

  return /[a-zA-Z]/.test(trimmed);
}

export function resolveLengthStyleValue(value: string): string | undefined {
  const trimmed = value.trim();
  if (isCssLengthTokenValue(trimmed)) {
    return trimmed;
  }

  const px = Number.parseInt(trimmed, 10);
  if (!Number.isFinite(px)) {
    return undefined;
  }

  return `${px}px`;
}

export function resolveMarginStyleValue(value: string): string | undefined {
  const trimmed = value.trim();
  if (isCssLengthTokenValue(trimmed)) {
    return trimmed;
  }

  const px = Number.parseInt(trimmed, 10);
  if (!Number.isFinite(px)) {
    return undefined;
  }

  return `${px}px`;
}
