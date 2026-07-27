/**
 * Score related records by matching alias field values against a haystack
 * string. Domain-agnostic (tenant config supplies field names).
 *
 * Prefer case-insensitive exact alias equality; otherwise pick the longest
 * alias that is a substring of the haystack (stable candidate order on ties).
 * As a third tier, score match-normalized token overlap when both sides share
 * the same leading token (anchor) — covers shapes where token order differs
 * and directional `includes` misses.
 *
 * Alias values are compared both as uppercase trim and as
 * {@link normalizeMatchText} so raw field values match normalized haystacks.
 */

import { normalizeMatchText } from "./expression.js";

function normalizeText(value: unknown): string {
  return typeof value === "string" ? value.trim().toUpperCase() : "";
}

function matchTokens(value: string): readonly string[] {
  const normalized = normalizeMatchText(value);
  if (normalized.length === 0) {
    return [];
  }
  return normalized.split(" ");
}

function sharedTokenCount(
  left: ReadonlySet<string>,
  right: readonly string[],
): number {
  let count = 0;
  for (const token of right) {
    if (left.has(token)) {
      count += 1;
    }
  }
  return count;
}

export function aliasesFromFieldValue(value: unknown): readonly string[] {
  if (typeof value === "string") {
    const normalized = normalizeText(value);
    if (normalized.length === 0) {
      return [];
    }
    const matched = normalizeMatchText(value);
    return matched && matched !== normalized
      ? [normalized, matched]
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
  if (best) {
    return best;
  }

  const haystackTokenList = matchTokens(haystack);
  if (haystackTokenList.length === 0) {
    return null;
  }
  const haystackLeading = haystackTokenList[0]!;
  const haystackTokenSet = new Set(haystackTokenList);

  let overlapBest: T | null = null;
  let bestShared = 0;
  let bestAliasLength = 0;
  for (const candidate of options.candidates) {
    for (const alias of aliasesFromFieldValue(candidate[options.aliasField])) {
      const aliasTokens = matchTokens(alias);
      if (aliasTokens.length === 0 || aliasTokens[0] !== haystackLeading) {
        continue;
      }
      const shared = sharedTokenCount(haystackTokenSet, [
        ...new Set(aliasTokens),
      ]);
      if (
        shared > bestShared ||
        (shared === bestShared && alias.length > bestAliasLength)
      ) {
        overlapBest = candidate;
        bestShared = shared;
        bestAliasLength = alias.length;
      }
    }
  }

  return overlapBest;
}
