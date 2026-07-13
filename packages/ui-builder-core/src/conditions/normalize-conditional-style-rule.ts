import type { StyleRule } from "../styles/style-types.js";
import type { ConditionalStyleRule } from "../types/styling.js";

export interface NormalizedConditionalStyleRule {
  readonly matchValue: string;
  readonly badgeVariant?: ConditionalStyleRule["badgeVariant"];
  readonly styles: readonly StyleRule[];
}

function legacyStylesFromRule(rule: ConditionalStyleRule): StyleRule[] {
  const styles: StyleRule[] = [];

  if (rule.background && rule.background.trim().length > 0) {
    styles.push({
      property: "backgroundColor",
      value: rule.background.trim(),
    });
  }

  if (rule.textColor && rule.textColor.trim().length > 0) {
    styles.push({
      property: "color",
      value: rule.textColor.trim(),
    });
  }

  return styles;
}

export function normalizeConditionalStyleRule(
  rule: ConditionalStyleRule,
): NormalizedConditionalStyleRule {
  const explicitStyles = rule.styles ?? [];
  const styles =
    explicitStyles.length > 0 ? explicitStyles : legacyStylesFromRule(rule);

  return {
    matchValue: rule.matchValue,
    ...(rule.badgeVariant ? { badgeVariant: rule.badgeVariant } : {}),
    styles,
  };
}

export function formatConditionalRulePreview(
  rule: ConditionalStyleRule,
  compareFieldLabel?: string,
): string {
  const normalized = normalizeConditionalStyleRule(rule);
  const parts: string[] = [];

  if (rule.conditionKind === "activePath") {
    parts.push(`path = ${normalized.matchValue}`);
  } else if (rule.conditionKind === "dashboardDateFilter") {
    parts.push(`dateFilter = ${normalized.matchValue}`);
  } else if (compareFieldLabel && compareFieldLabel.trim().length > 0) {
    parts.push(`${compareFieldLabel} = ${normalized.matchValue}`);
  } else if (rule.compareFieldPath && rule.compareFieldPath.trim().length > 0) {
    parts.push(`${rule.compareFieldPath} = ${normalized.matchValue}`);
  }

  if (normalized.badgeVariant) {
    parts.push(`badge: ${normalized.badgeVariant}`);
  }

  for (const style of normalized.styles) {
    const value =
      style.value ??
      (style.valuesByBreakpoint
        ? Object.entries(style.valuesByBreakpoint)
            .filter(([, entry]) => entry !== undefined)
            .map(([breakpoint, entry]) => `${breakpoint}:${entry}`)
            .join(", ")
        : "");
    if (value.length > 0) {
      parts.push(`${style.property}: ${value}`);
    }
  }

  return parts.length > 0 ? parts.join(", ") : "—";
}
