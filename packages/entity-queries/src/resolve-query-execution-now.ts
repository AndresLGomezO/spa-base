import type {
  DashboardDateFilterContextValue,
  PageFilterContext,
} from "./resolve-filter-bindings.js";

/**
 * Anchor temporal presets (startOfWeek, today, …) to a dashboard date bucket.
 * Month buckets use day 15 UTC; year uses July 15; day uses noon UTC.
 */
export function resolveQueryExecutionNowFromDateFilter(
  filter?: DashboardDateFilterContextValue,
): Date {
  if (!filter?.value) {
    return new Date();
  }

  const value = filter.value.trim();

  switch (filter.granularity) {
    case "month": {
      const match = /^(\d{4})-(\d{2})$/.exec(value);
      if (match) {
        return new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, 15));
      }
      break;
    }
    case "year": {
      const match = /^(\d{4})$/.exec(value);
      if (match) {
        return new Date(Date.UTC(Number(match[1]), 6, 15));
      }
      break;
    }
    case "day": {
      const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
      if (match) {
        return new Date(
          Date.UTC(
            Number(match[1]),
            Number(match[2]) - 1,
            Number(match[3]),
            12,
          ),
        );
      }
      break;
    }
  }

  return new Date();
}

/** Anchor temporal presets from page/dashboard filter context. */
export function resolveQueryExecutionNow(context?: PageFilterContext): Date {
  return resolveQueryExecutionNowFromDateFilter(context?.dashboardDateFilter);
}

/**
 * Infer a date-bucket granularity from a common ISO-like bucket string.
 * Falls back to `month` when the shape is ambiguous.
 */
export function inferDateBucketGranularity(
  value: string,
): DashboardDateFilterContextValue["granularity"] {
  const trimmed = value.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return "day";
  }
  if (/^\d{4}-\d{2}$/.test(trimmed)) {
    return "month";
  }
  if (/^\d{4}$/.test(trimmed)) {
    return "year";
  }
  return "month";
}

/**
 * Anchor temporal presets from a computed-metric `period` (or similar) parameter.
 */
export function resolveQueryExecutionNowFromDateBucket(
  value: unknown,
  granularity?: DashboardDateFilterContextValue["granularity"],
): Date {
  if (typeof value !== "string" || value.trim().length === 0) {
    return new Date();
  }

  const trimmed = value.trim();
  return resolveQueryExecutionNowFromDateFilter({
    value: trimmed,
    granularity: granularity ?? inferDateBucketGranularity(trimmed),
    param: "period",
  });
}
