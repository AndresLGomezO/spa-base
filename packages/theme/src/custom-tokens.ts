import type {
  TenantCustomToken,
  TenantCustomTokenKind,
} from "@repo/shared-types";

import { COLOR_SCALE_STEPS } from "./palette/scale-steps.js";
import { normalizeHexColor } from "./palette/generate-scale.js";
import type { AppearanceColorScheme } from "./semantics/dark-mode-remaps.js";

export const MAX_CUSTOM_TOKENS = 32;

const PALETTE_KINDS = [
  "primary",
  "neutral",
  "success",
  "warning",
  "danger",
] as const;

const RESERVED_COLOR_SLUGS = new Set<string>([
  "background",
  "foreground",
  "primary",
  "muted",
  "border",
  "card",
  "popover",
  "accent",
  "hover",
  "active",
  "backdrop",
  "focus",
  "sidebar",
  "badge",
  "chart",
  "success",
  "warning",
  "danger",
  "info",
  "neutral",
  "transparent",
]);

const RESERVED_GRADIENT_SLUGS = new Set<string>(["primary"]);

function buildReservedSlugs(kind: TenantCustomTokenKind): Set<string> {
  const reserved = new Set<string>(
    kind === "color" ? RESERVED_COLOR_SLUGS : RESERVED_GRADIENT_SLUGS,
  );

  for (const paletteKind of PALETTE_KINDS) {
    reserved.add(paletteKind);
    for (const step of COLOR_SCALE_STEPS) {
      reserved.add(`${paletteKind}-${step}`);
    }
  }

  for (let index = 1; index <= 4; index += 1) {
    reserved.add(`chart-${index}`);
  }

  return reserved;
}

export function resolveCustomTokenCssVar(token: TenantCustomToken): string {
  const prefix = token.kind === "color" ? "--color-" : "--gradient-";
  return `${prefix}${token.name.trim()}`;
}

export function resolveCustomTokenCssVarValue(
  token: TenantCustomToken,
): string {
  return `var(${resolveCustomTokenCssVar(token)})`;
}

export function isReservedCustomTokenSlug(
  kind: TenantCustomTokenKind,
  name: string,
): boolean {
  return buildReservedSlugs(kind).has(name.trim().toLowerCase());
}

export function normalizeCustomTokenName(name: string): string {
  return name.trim().toLowerCase();
}

export function validateCustomTokenValue(
  kind: TenantCustomTokenKind,
  value: string,
): string {
  const trimmed = value.trim();
  if (kind === "color") {
    return normalizeHexColor(trimmed);
  }
  if (trimmed.length === 0) {
    throw new Error("Gradient value is required.");
  }
  return trimmed;
}

export function sanitizeCustomTokens(
  tokens: readonly TenantCustomToken[] | undefined,
): TenantCustomToken[] {
  if (!tokens?.length) {
    return [];
  }

  const seen = new Set<string>();
  const sanitized: TenantCustomToken[] = [];

  for (const token of tokens.slice(0, MAX_CUSTOM_TOKENS)) {
    const name = normalizeCustomTokenName(token.name);
    if (!name || isReservedCustomTokenSlug(token.kind, name)) {
      continue;
    }

    const dedupeKey = `${token.kind}:${name}`;
    if (seen.has(dedupeKey)) {
      continue;
    }
    seen.add(dedupeKey);

    const light = token.light?.trim();
    const dark = token.dark?.trim();
    if (!light && !dark) {
      continue;
    }

    sanitized.push({
      kind: token.kind,
      name,
      ...(token.label?.trim() ? { label: token.label.trim() } : {}),
      ...(light ? { light: validateCustomTokenValue(token.kind, light) } : {}),
      ...(dark ? { dark: validateCustomTokenValue(token.kind, dark) } : {}),
    });
  }

  return sanitized;
}

export function applyCustomTokens(
  tokens: readonly TenantCustomToken[] | undefined,
  colorScheme: AppearanceColorScheme,
  vars: Record<string, string>,
): void {
  for (const token of sanitizeCustomTokens(tokens)) {
    const value = token[colorScheme]?.trim();
    if (!value) {
      continue;
    }
    vars[resolveCustomTokenCssVar(token)] = value;
  }
}

export interface CustomTokenColorOption {
  readonly label: string;
  readonly value: string;
}

export function buildCustomTokenColorOptions(
  tokens: readonly TenantCustomToken[] | undefined,
): readonly CustomTokenColorOption[] {
  return sanitizeCustomTokens(tokens).map((token) => ({
    label: token.label?.trim() || token.name,
    value: resolveCustomTokenCssVarValue(token),
  }));
}
