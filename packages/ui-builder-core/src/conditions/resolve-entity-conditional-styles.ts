import type { StyleRule } from "../styles/style-types.js";
import type { ConditionalStyleRule } from "../types/styling.js";
import { isActivePathMatch } from "./is-active-path-match.js";
import {
  applyConditionalStyleRule,
  matchConditionalDaysRemainingStyles,
  matchConditionalStyles,
  matchConditionalStylesForDate,
  type MatchedConditionalStyles,
} from "./match-conditional-styles.js";
import { normalizeConditionalStyleRule } from "./normalize-conditional-style-rule.js";
import type { ResolveStyleRulesOptions } from "../styles/apply-style-rules.js";

const DAYS_REMAINING_THRESHOLD_PATTERN = /^([<>]=?)(-?\d+)$/;

export interface CompareFieldDisplayMeta {
  readonly fieldType?: string;
  readonly dateDisplayFormat?: string;
}

export interface ResolveEntityConditionalStylesOptions {
  readonly resolveField: (path: string) => unknown;
  readonly resolveFieldMeta?: (
    path: string,
  ) => CompareFieldDisplayMeta | undefined;
  readonly defaultCompareFieldPath?: string;
  readonly atBreakpoint?: ResolveStyleRulesOptions["atBreakpoint"];
  readonly timeZone?: string;
  readonly referenceDate?: Date;
  /** Current route pathname (no query/hash). Used by `conditionKind: "activePath"`. */
  readonly resolveActivePathname?: () => string;
}

function hasMatchedConditionalOutput(
  matched: MatchedConditionalStyles,
): boolean {
  return Boolean(
    matched.badgeVariant ||
    matched.className ||
    matched.style ||
    matched.styleScopeClassName ||
    matched.cssText,
  );
}

function isDateCompareField(
  meta: CompareFieldDisplayMeta | undefined,
): boolean {
  return meta?.fieldType === "date";
}

function mergeRuleCompareFieldMeta(
  rule: ConditionalStyleRule,
  meta: CompareFieldDisplayMeta | undefined,
): CompareFieldDisplayMeta | undefined {
  const dateDisplayFormat =
    rule.compareFieldDateFormat ?? meta?.dateDisplayFormat;

  if (isDateCompareField(meta) || rule.compareFieldDateFormat) {
    return {
      ...meta,
      fieldType: meta?.fieldType ?? "date",
      ...(dateDisplayFormat ? { dateDisplayFormat } : {}),
    };
  }

  return meta;
}

function shouldUseDaysRemainingMatching(
  rule: ConditionalStyleRule,
  meta: CompareFieldDisplayMeta | undefined,
): boolean {
  const matchValue =
    typeof rule.matchValue === "string" ? rule.matchValue.trim() : "";
  if (DAYS_REMAINING_THRESHOLD_PATTERN.test(matchValue)) {
    return true;
  }
  const dateDisplayFormat =
    rule.compareFieldDateFormat ?? meta?.dateDisplayFormat;
  return dateDisplayFormat === "daysRemaining";
}

function matchSingleRule(
  rule: ConditionalStyleRule,
  rawValue: unknown,
  meta: CompareFieldDisplayMeta | undefined,
  options: ResolveEntityConditionalStylesOptions,
): MatchedConditionalStyles | null {
  const matcherOptions = {
    atBreakpoint: options.atBreakpoint,
    timeZone: options.timeZone ?? "UTC",
    referenceDate: options.referenceDate,
  };

  if (isDateCompareField(meta)) {
    if (shouldUseDaysRemainingMatching(rule, meta)) {
      const daysRemainingMatch = matchConditionalDaysRemainingStyles(
        rawValue,
        [rule],
        matcherOptions,
      );
      if (hasMatchedConditionalOutput(daysRemainingMatch)) {
        return daysRemainingMatch;
      }
    }

    const dateMatch = matchConditionalStylesForDate(rawValue, [rule], {
      ...matcherOptions,
      dateDisplayFormat: meta?.dateDisplayFormat,
    });
    if (hasMatchedConditionalOutput(dateMatch)) {
      return dateMatch;
    }

    return null;
  }

  const exactMatch = matchConditionalStyles(rawValue, [rule], {
    atBreakpoint: options.atBreakpoint,
  });
  return hasMatchedConditionalOutput(exactMatch) ? exactMatch : null;
}

function matchActivePathRule(
  rule: ConditionalStyleRule,
  options: ResolveEntityConditionalStylesOptions,
): MatchedConditionalStyles | null {
  const matchPath =
    typeof rule.matchValue === "string" ? rule.matchValue.trim() : "";
  if (matchPath.length === 0) {
    return null;
  }

  const pathname = options.resolveActivePathname?.()?.trim() ?? "";
  if (!isActivePathMatch(pathname, matchPath)) {
    return null;
  }

  const matched = applyConditionalStyleRule(rule, {
    atBreakpoint: options.atBreakpoint,
  });
  return hasMatchedConditionalOutput(matched) ? matched : null;
}

function findMatchingConditionalStyleRule(
  rules: readonly ConditionalStyleRule[] | undefined,
  options: ResolveEntityConditionalStylesOptions,
): ConditionalStyleRule | undefined {
  if (!rules || rules.length === 0) {
    return undefined;
  }

  for (const rule of rules) {
    if (rule.conditionKind === "activePath") {
      if (matchActivePathRule(rule, options)) {
        return rule;
      }
      continue;
    }

    const fieldPath = (
      rule.compareFieldPath ?? options.defaultCompareFieldPath
    )?.trim();
    if (!fieldPath) {
      continue;
    }

    const rawValue = options.resolveField(fieldPath);
    const meta = options.resolveFieldMeta?.(fieldPath);
    if (
      matchSingleRule(
        rule,
        rawValue,
        mergeRuleCompareFieldMeta(rule, meta),
        options,
      )
    ) {
      return rule;
    }
  }

  return undefined;
}

/**
 * Returns base style rules with properties overridden by the first matching
 * conditional rule's styles (conditional wins per property).
 */
export function resolveStylesWithMatchedConditionalOverrides(
  baseStyles: readonly StyleRule[] | undefined,
  rules: readonly ConditionalStyleRule[] | undefined,
  options: ResolveEntityConditionalStylesOptions,
): readonly StyleRule[] | undefined {
  const matched = findMatchingConditionalStyleRule(rules, options);
  if (!matched) {
    return baseStyles;
  }

  const normalized = normalizeConditionalStyleRule(matched);
  if (normalized.styles.length === 0) {
    return baseStyles;
  }

  const overridden = new Set(normalized.styles.map((style) => style.property));
  return [
    ...(baseStyles ?? []).filter((style) => !overridden.has(style.property)),
    ...normalized.styles,
  ];
}

export function resolveEntityConditionalStyles(
  rules: readonly ConditionalStyleRule[] | undefined,
  options: ResolveEntityConditionalStylesOptions,
): MatchedConditionalStyles {
  if (!rules || rules.length === 0) {
    return {};
  }

  for (const rule of rules) {
    if (rule.conditionKind === "activePath") {
      const matched = matchActivePathRule(rule, options);
      if (matched) {
        return matched;
      }
      continue;
    }

    const fieldPath = (
      rule.compareFieldPath ?? options.defaultCompareFieldPath
    )?.trim();
    if (!fieldPath) {
      continue;
    }

    const rawValue = options.resolveField(fieldPath);
    const meta = options.resolveFieldMeta?.(fieldPath);
    const matched = matchSingleRule(
      rule,
      rawValue,
      mergeRuleCompareFieldMeta(rule, meta),
      options,
    );
    if (matched) {
      return matched;
    }
  }

  return {};
}
