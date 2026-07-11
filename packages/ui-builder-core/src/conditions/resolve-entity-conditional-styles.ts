import type { ConditionalStyleRule } from "../types/styling.js";
import {
  matchConditionalDaysRemainingStyles,
  matchConditionalStyles,
  matchConditionalStylesForDate,
  type MatchedConditionalStyles,
} from "./match-conditional-styles.js";
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

export function resolveEntityConditionalStyles(
  rules: readonly ConditionalStyleRule[] | undefined,
  options: ResolveEntityConditionalStylesOptions,
): MatchedConditionalStyles {
  if (!rules || rules.length === 0) {
    return {};
  }

  for (const rule of rules) {
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
