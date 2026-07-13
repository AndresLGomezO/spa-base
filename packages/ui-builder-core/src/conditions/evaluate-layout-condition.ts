import {
  diffCalendarDays,
  parseDateValue,
} from "../dates/diff-calendar-days.js";
import type { LayoutCondition } from "../types/styling.js";
import { isActivePathMatch } from "./is-active-path-match.js";

export type LayoutConditionDateGranularity = "year" | "month" | "day";

export interface LayoutConditionDashboardDateFilter {
  readonly value: string;
  readonly granularity: LayoutConditionDateGranularity;
}

export interface CompareFieldDisplayMeta {
  readonly fieldType?: string;
  readonly dateDisplayFormat?: string;
}

export interface EvaluateLayoutConditionContext {
  readonly resolveField?: (path: string) => unknown;
  readonly resolveFieldMeta?: (
    path: string,
  ) => CompareFieldDisplayMeta | undefined;
  /** Defaults to the component bound field when evaluating field conditions. */
  readonly defaultCompareFieldPath?: string;
  readonly resolveActivePathname?: () => string;
  readonly dashboardDateFilter?: LayoutConditionDashboardDateFilter;
  readonly timeZone?: string;
  readonly referenceDate?: Date;
}

const DAYS_REMAINING_THRESHOLD_PATTERN = /^([<>]=?)(-?\d+)$/;

function padTwo(value: number): string {
  return String(value).padStart(2, "0");
}

export function formatCurrentDateBucket(
  granularity: LayoutConditionDateGranularity,
  now: Date = new Date(),
): string {
  const year = now.getUTCFullYear();
  const month = padTwo(now.getUTCMonth() + 1);
  const day = padTwo(now.getUTCDate());

  switch (granularity) {
    case "year":
      return String(year);
    case "month":
      return `${year}-${month}`;
    case "day":
      return `${year}-${month}-${day}`;
  }
}

function isDateCompareField(
  meta: CompareFieldDisplayMeta | undefined,
): boolean {
  return meta?.fieldType === "date";
}

function mergeConditionCompareFieldMeta(
  condition: LayoutCondition,
  meta: CompareFieldDisplayMeta | undefined,
): CompareFieldDisplayMeta | undefined {
  const dateDisplayFormat =
    condition.compareFieldDateFormat ?? meta?.dateDisplayFormat;

  if (isDateCompareField(meta) || condition.compareFieldDateFormat) {
    return {
      ...meta,
      fieldType: meta?.fieldType ?? "date",
      ...(dateDisplayFormat ? { dateDisplayFormat } : {}),
    };
  }

  return meta;
}

function shouldUseDaysRemainingMatching(
  condition: LayoutCondition,
  meta: CompareFieldDisplayMeta | undefined,
): boolean {
  const matchValue =
    typeof condition.matchValue === "string" ? condition.matchValue.trim() : "";
  if (DAYS_REMAINING_THRESHOLD_PATTERN.test(matchValue)) {
    return true;
  }
  const dateDisplayFormat =
    condition.compareFieldDateFormat ?? meta?.dateDisplayFormat;
  return dateDisplayFormat === "daysRemaining";
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

function evaluateDaysRemainingMatch(
  rawValue: unknown,
  condition: LayoutCondition,
  context: EvaluateLayoutConditionContext,
): boolean {
  const matchValue =
    typeof condition.matchValue === "string" ? condition.matchValue.trim() : "";
  if (matchValue.length === 0) {
    return false;
  }

  const thresholdMatch = matchValue.match(DAYS_REMAINING_THRESHOLD_PATTERN);
  if (!thresholdMatch) {
    return false;
  }

  const targetDate = parseDateValue(rawValue);
  if (!targetDate) {
    return false;
  }

  const operator = thresholdMatch[1] as "<" | "<=" | ">" | ">=";
  const threshold = Number(thresholdMatch[2]);
  if (!Number.isFinite(threshold)) {
    return false;
  }

  const days = diffCalendarDays(
    targetDate,
    context.referenceDate ?? new Date(),
    context.timeZone ?? "UTC",
  );
  return matchesDaysRemainingThreshold(days, operator, threshold);
}

function evaluateExactFieldMatch(
  rawValue: unknown,
  condition: LayoutCondition,
): boolean {
  const matchValue =
    typeof condition.matchValue === "string" ? condition.matchValue.trim() : "";
  if (matchValue.length === 0) {
    return false;
  }
  const normalized =
    rawValue === null || rawValue === undefined ? "" : String(rawValue).trim();
  return matchValue === normalized;
}

function evaluateFieldCondition(
  condition: LayoutCondition,
  context: EvaluateLayoutConditionContext,
): boolean {
  const fieldPath = (
    condition.compareFieldPath ?? context.defaultCompareFieldPath
  )?.trim();
  if (!fieldPath || !context.resolveField) {
    return false;
  }

  const rawValue = context.resolveField(fieldPath);
  const meta = mergeConditionCompareFieldMeta(
    condition,
    context.resolveFieldMeta?.(fieldPath),
  );

  if (isDateCompareField(meta)) {
    if (shouldUseDaysRemainingMatching(condition, meta)) {
      if (evaluateDaysRemainingMatch(rawValue, condition, context)) {
        return true;
      }
      // Threshold pattern without match falls through only when format is daysRemaining
      // and matchValue is not a threshold — then exact string match below still applies.
      if (DAYS_REMAINING_THRESHOLD_PATTERN.test(condition.matchValue.trim())) {
        return false;
      }
    }
    if (meta?.dateDisplayFormat === "daysRemaining") {
      return evaluateDaysRemainingMatch(rawValue, condition, context);
    }
  }

  return evaluateExactFieldMatch(rawValue, condition);
}

function evaluateActivePathCondition(
  condition: LayoutCondition,
  context: EvaluateLayoutConditionContext,
): boolean {
  const matchPath =
    typeof condition.matchValue === "string" ? condition.matchValue.trim() : "";
  if (matchPath.length === 0) {
    return false;
  }
  const pathname = context.resolveActivePathname?.()?.trim() ?? "";
  return isActivePathMatch(pathname, matchPath);
}

function evaluateDashboardDateFilterCondition(
  condition: LayoutCondition,
  context: EvaluateLayoutConditionContext,
): boolean {
  const filter = context.dashboardDateFilter;
  // Designer / non-dashboard surfaces: treat as visible (fail-open).
  if (!filter) {
    return true;
  }

  const matchValue =
    typeof condition.matchValue === "string" ? condition.matchValue.trim() : "";
  if (matchValue.length === 0) {
    return false;
  }

  if (matchValue === "currentPeriod") {
    return (
      filter.value ===
      formatCurrentDateBucket(
        filter.granularity,
        context.referenceDate ?? new Date(),
      )
    );
  }

  return filter.value === matchValue;
}

/**
 * Returns whether a single layout condition matches the given context.
 */
export function evaluateLayoutCondition(
  condition: LayoutCondition,
  context: EvaluateLayoutConditionContext = {},
): boolean {
  const kind = condition.conditionKind ?? "field";

  switch (kind) {
    case "activePath":
      return evaluateActivePathCondition(condition, context);
    case "dashboardDateFilter":
      return evaluateDashboardDateFilterCondition(condition, context);
    case "field":
    default:
      return evaluateFieldCondition(condition, context);
  }
}

/**
 * AND semantics: omitted/empty → true; otherwise every condition must match.
 */
export function evaluateLayoutConditions(
  conditions: readonly LayoutCondition[] | undefined,
  context: EvaluateLayoutConditionContext = {},
): boolean {
  if (!conditions || conditions.length === 0) {
    return true;
  }
  return conditions.every((condition) =>
    evaluateLayoutCondition(condition, context),
  );
}
