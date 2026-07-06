/** CSS value helpers for UI builder style rules (no @repo/theme dependency). */

/** Modern CSS color functions, e.g. color-mix(in oklch, var(--color-primary) 14%, transparent). */
export function isCssColorMixValue(value: string): boolean {
  const trimmed = value.trim();
  if (!/^color-mix\s*\(/i.test(trimmed)) {
    return false;
  }

  let depth = 0;
  let started = false;
  for (const char of trimmed) {
    if (char === "(") {
      depth += 1;
      started = true;
    } else if (char === ")") {
      depth -= 1;
    }
  }

  return started && depth === 0;
}

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

export function isCssBackdropFilterValue(value: string): boolean {
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return false;
  }

  if (/^var\(--[a-zA-Z0-9-]+\)$/.test(trimmed)) {
    return true;
  }

  return /(?:blur|brightness|contrast|grayscale|hue-rotate|invert|opacity|saturate|sepia)\(/i.test(
    trimmed,
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

/** Resolves box/inset lengths: theme tokens, px integers, %, auto, and bare 0. */
export function resolveBoxLengthStyleValue(value: string): string | undefined {
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return undefined;
  }

  if (isCssLengthTokenValue(trimmed)) {
    return trimmed;
  }

  if (trimmed === "auto") {
    return trimmed;
  }

  if (/^-?\d+(\.\d+)?%$/.test(trimmed)) {
    return trimmed;
  }

  const px = Number.parseInt(trimmed, 10);
  if (!Number.isFinite(px)) {
    return undefined;
  }

  return `${px}px`;
}

export function resolveLengthStyleValue(value: string): string | undefined {
  return resolveBoxLengthStyleValue(value);
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
