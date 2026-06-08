import type { CardBadgeVariant } from "../types/component.js";
import type { ConditionalStyleRule } from "../types/styling.js";
import {
  themeTokenBackgroundClass,
  themeTokenTextClass,
} from "../styles/theme-token-classes.js";

export interface MatchedConditionalStyles {
  readonly badgeVariant?: CardBadgeVariant;
  readonly className?: string;
}

export function matchConditionalStyles(
  rawValue: unknown,
  rules: readonly ConditionalStyleRule[] | undefined,
): MatchedConditionalStyles {
  if (!rules || rules.length === 0) {
    return {};
  }

  const normalized =
    rawValue === null || rawValue === undefined ? "" : String(rawValue).trim();

  for (const rule of rules) {
    const matchValue =
      typeof rule.matchValue === "string" ? rule.matchValue.trim() : "";
    if (matchValue.length === 0) {
      continue;
    }
    if (matchValue === normalized) {
      const classes: string[] = [];
      if (rule.background) {
        classes.push(themeTokenBackgroundClass(rule.background));
      }
      if (rule.textColor) {
        classes.push(themeTokenTextClass(rule.textColor));
      }
      return {
        badgeVariant: rule.badgeVariant,
        className: classes.length > 0 ? classes.join(" ") : undefined,
      };
    }
  }

  return {};
}

export function conditionalRulesToBadgeVariants(
  rules: readonly ConditionalStyleRule[] | undefined,
): Readonly<Record<string, CardBadgeVariant>> | undefined {
  if (!rules || rules.length === 0) {
    return undefined;
  }

  const map: Record<string, CardBadgeVariant> = {};
  for (const rule of rules) {
    if (rule.badgeVariant) {
      map[rule.matchValue] = rule.badgeVariant;
    }
  }

  return Object.keys(map).length > 0 ? map : undefined;
}
