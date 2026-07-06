import {
  diffCalendarDays,
  parseDateValue,
} from "../dates/diff-calendar-days.js";
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
    readonly background?: string;
    readonly color?: string;
  };
}

const DAYS_REMAINING_THRESHOLD_PATTERN = /^([<>]=?)(-?\d+)$/;

function applyConditionalStyleRule(
  rule: ConditionalStyleRule,
): MatchedConditionalStyles {
  const classes: string[] = [];
  const style: {
    backgroundColor?: string;
    background?: string;
    color?: string;
  } = {};
  const background = resolveBackgroundComponentColor(rule.background);
  const textColor = resolveTextComponentColor(rule.textColor);

  if (background.className) {
    classes.push(background.className);
  }
  if (background.background) {
    style.background = background.background;
  } else if (background.backgroundColor) {
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

function matchesDaysRemainingThreshold(
  days: number,
  operator: "<" | "<=" | ">" | ">=",
  threshold: number,
): boolean {
  switch (operator) {
    case "<":
      return days < threshold;
    case "<=":
      return days <= threshold;
    case ">":
      return days > threshold;
    case ">=":
      return days >= threshold;
  }
}

export function matchConditionalDaysRemainingStyles(
  rawValue: unknown,
  rules: readonly ConditionalStyleRule[] | undefined,
  options: {
    readonly timeZone?: string;
    readonly referenceDate?: Date;
  } = {},
): MatchedConditionalStyles {
  if (!rules || rules.length === 0) {
    return {};
  }

  const targetDate = parseDateValue(rawValue);
  if (!targetDate) {
    return {};
  }

  const timeZone = options.timeZone ?? "UTC";
  const reference = options.referenceDate ?? new Date();
  const days = diffCalendarDays(targetDate, reference, timeZone);

  for (const rule of rules) {
    const matchValue =
      typeof rule.matchValue === "string" ? rule.matchValue.trim() : "";
    if (matchValue.length === 0) {
      continue;
    }

    const thresholdMatch = matchValue.match(DAYS_REMAINING_THRESHOLD_PATTERN);
    if (!thresholdMatch) {
      continue;
    }

    const operator = thresholdMatch[1] as "<" | "<=" | ">" | ">=";
    const threshold = Number(thresholdMatch[2]);
    if (!Number.isFinite(threshold)) {
      continue;
    }

    if (matchesDaysRemainingThreshold(days, operator, threshold)) {
      return applyConditionalStyleRule(rule);
    }
  }

  return {};
}

export function matchConditionalStylesForDate(
  rawValue: unknown,
  rules: readonly ConditionalStyleRule[] | undefined,
  options: {
    readonly dateDisplayFormat?: string;
    readonly timeZone?: string;
    readonly referenceDate?: Date;
  } = {},
): MatchedConditionalStyles {
  if (options.dateDisplayFormat === "daysRemaining") {
    const daysRemainingMatch = matchConditionalDaysRemainingStyles(
      rawValue,
      rules,
      options,
    );
    if (
      daysRemainingMatch.className ||
      daysRemainingMatch.style ||
      daysRemainingMatch.badgeVariant
    ) {
      return daysRemainingMatch;
    }
  }

  return matchConditionalStyles(rawValue, rules);
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
      return applyConditionalStyleRule(rule);
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
