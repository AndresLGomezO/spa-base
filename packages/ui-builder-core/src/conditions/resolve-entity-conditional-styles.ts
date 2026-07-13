import type { StyleRule } from "../styles/style-types.js";
import type { ConditionalStyleRule } from "../types/styling.js";
import {
  evaluateLayoutCondition,
  type CompareFieldDisplayMeta,
  type EvaluateLayoutConditionContext,
} from "./evaluate-layout-condition.js";
import {
  applyConditionalStyleRule,
  type MatchedConditionalStyles,
} from "./match-conditional-styles.js";
import { normalizeConditionalStyleRule } from "./normalize-conditional-style-rule.js";
import type { ResolveStyleRulesOptions } from "../styles/apply-style-rules.js";

export type { CompareFieldDisplayMeta };

export interface ResolveEntityConditionalStylesOptions extends EvaluateLayoutConditionContext {
  readonly resolveField: (path: string) => unknown;
  readonly atBreakpoint?: ResolveStyleRulesOptions["atBreakpoint"];
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

function findMatchingConditionalStyleRule(
  rules: readonly ConditionalStyleRule[] | undefined,
  options: ResolveEntityConditionalStylesOptions,
): ConditionalStyleRule | undefined {
  if (!rules || rules.length === 0) {
    return undefined;
  }

  for (const rule of rules) {
    if (evaluateLayoutCondition(rule, options)) {
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
    if (!evaluateLayoutCondition(rule, options)) {
      continue;
    }
    const matched = applyConditionalStyleRule(rule, {
      atBreakpoint: options.atBreakpoint,
    });
    if (hasMatchedConditionalOutput(matched) || rule.badgeVariant) {
      return matched;
    }
    // Condition matched but rule has no style output — still "first match wins"
    // for empty style rules (preserve prior behavior of applying empty match).
    return matched;
  }

  return {};
}
