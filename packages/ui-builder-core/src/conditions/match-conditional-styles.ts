import type { CardBadgeVariant } from "../types/component.js";
import type { ConditionalStyleRule } from "../types/styling.js";
import {
  resolveBackgroundComponentColor,
  resolveTextComponentColor,
} from "../styles/resolve-component-color.js";

export interface MatchedConditionalStyles {
  readonly badgeVariant?: CardBadgeVariant;
  readonly className?: string;
  readonly style?: {
    readonly backgroundColor?: string;
    readonly color?: string;
  };
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
      const style: { backgroundColor?: string; color?: string } = {};
      const background = resolveBackgroundComponentColor(rule.background);
      const textColor = resolveTextComponentColor(rule.textColor);

      if (background.className) {
        classes.push(background.className);
      }
      if (background.backgroundColor) {
        style.backgroundColor = background.backgroundColor;
      }
      if (textColor.className) {
        classes.push(textColor.className);
      }
      if (textColor.color) {
        style.color = textColor.color;
      }

      return {
        badgeVariant: rule.badgeVariant,
        className: classes.length > 0 ? classes.join(" ") : undefined,
        style: Object.keys(style).length > 0 ? style : undefined,
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
