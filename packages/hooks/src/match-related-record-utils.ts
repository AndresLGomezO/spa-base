/**
 * Score related records by matching alias field values against a haystack
 * string. Domain-agnostic (tenant config supplies field names).
 *
 * Prefer case-insensitive exact alias equality; otherwise pick the longest
 * alias that is a substring of the haystack (stable candidate order on ties).
 *
 * Alias values are compared both as uppercase trim and as
 * {@link normalizeMerchantText} so raw descriptions match normalized haystacks.
 */

import { normalizeMerchantText } from "./expression.js";

function normalizeText(value: unknown): string {
  return typeof value === "string" ? value.trim().toUpperCase() : "";
}

export function aliasesFromFieldValue(value: unknown): readonly string[] {
  if (typeof value === "string") {
    const normalized = normalizeText(value);
    if (normalized.length === 0) {
      return [];
    }
    const merchant = normalizeMerchantText(value);
    return merchant && merchant !== normalized
      ? [normalized, merchant]
      : [normalized];
  }
  if (!Array.isArray(value)) {
    return [];
  }
  const aliases: string[] = [];
  for (const entry of value) {
    aliases.push(...aliasesFromFieldValue(entry));
  }
  return [...new Set(aliases)];
}

export function pickBestAliasMatch<T extends Record<string, unknown>>(options: {
  readonly haystack: unknown;
  readonly aliasField: string;
  readonly candidates: readonly T[];
}): T | null {
  const haystack = normalizeText(options.haystack);
  if (!haystack) {
    return null;
  }

  for (const candidate of options.candidates) {
    const aliases = aliasesFromFieldValue(candidate[options.aliasField]);
    if (aliases.some((alias) => alias === haystack)) {
      return candidate;
    }
  }

  let best: T | null = null;
  let bestLength = 0;
  for (const candidate of options.candidates) {
    for (const alias of aliasesFromFieldValue(candidate[options.aliasField])) {
      if (haystack.includes(alias) && alias.length > bestLength) {
        best = candidate;
        bestLength = alias.length;
      }
    }
  }

  return best;
}
