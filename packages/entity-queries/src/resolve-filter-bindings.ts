import type { FilterBindingSource } from "@repo/entities";
import {
  normalizeMetricDateValue,
  shiftMetricDateBucket,
  type MetricDateGranularity,
} from "@repo/metrics-engine/browser";

export interface DashboardDateFilterContextValue {
  readonly value: string;
  readonly granularity: MetricDateGranularity;
  readonly param: string;
}

export interface PageFilterContext {
  readonly record?: Record<string, unknown>;
  readonly listFilters?: Readonly<Record<string, readonly string[]>>;
  readonly routeParams?: Readonly<Record<string, string | undefined>>;
  readonly dashboardDateFilter?: DashboardDateFilterContextValue;
}

function padTwo(value: number): string {
  return String(value).padStart(2, "0");
}

function currentDateBucket(granularity: MetricDateGranularity): string {
  const now = new Date();
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

function parseListFilterValue(raw: string): string | number | boolean {
  const parsed = Number(raw);
  if (!Number.isNaN(parsed) && String(parsed) === raw) {
    return parsed;
  }
  if (raw === "true") {
    return true;
  }
  if (raw === "false") {
    return false;
  }
  return raw;
}

function resolveRelativePeriodAnchor(
  source: Extract<FilterBindingSource, { type: "relativePeriod" }>,
  context: PageFilterContext,
  granularity: MetricDateGranularity,
): string | null {
  switch (source.anchor) {
    case "dashboardDateFilter": {
      const filter = context.dashboardDateFilter;
      if (!filter || filter.granularity !== granularity) {
        return currentDateBucket(granularity);
      }
      return filter.value;
    }
    case "listFilter": {
      const field = source.anchorField ?? source.field;
      const values = context.listFilters?.[field];
      const first = values?.[0];
      if (first === undefined) {
        return null;
      }
      const normalized = normalizeMetricDateValue(first, granularity);
      return normalized;
    }
    case "routeParam": {
      const param = source.anchorParam;
      if (!param) {
        return null;
      }
      const value = context.routeParams?.[param];
      if (!value) {
        return null;
      }
      return normalizeMetricDateValue(value, granularity);
    }
    case "now":
      return currentDateBucket(granularity);
    default:
      return null;
  }
}

export function resolveFilterBindingSource(
  source: FilterBindingSource,
  context: PageFilterContext,
  options: {
    readonly dateFieldGranularity?: Readonly<
      Record<string, MetricDateGranularity>
    >;
  } = {},
): string | number | boolean | readonly string[] | null {
  switch (source.type) {
    case "static": {
      if (Array.isArray(source.value)) {
        return source.value.length > 0 ? source.value : null;
      }
      if (
        typeof source.value === "string" &&
        source.value.trim().length === 0
      ) {
        return null;
      }
      return source.value;
    }
    case "entityField": {
      if (!context.record) {
        return null;
      }
      const value = context.record[source.fieldPath];
      if (
        typeof value === "string" ||
        typeof value === "number" ||
        typeof value === "boolean"
      ) {
        return value;
      }
      return null;
    }
    case "listFilter": {
      const values = context.listFilters?.[source.field];
      if (!values || values.length === 0) {
        return null;
      }
      const first = values[0];
      if (first === undefined) {
        return null;
      }
      return parseListFilterValue(first);
    }
    case "routeParam": {
      const value = context.routeParams?.[source.param];
      if (value === undefined || value === "") {
        return null;
      }
      const parsed = Number(value);
      if (!Number.isNaN(parsed) && String(parsed) === value) {
        return parsed;
      }
      return value;
    }
    case "dashboardDateFilter": {
      const filter = context.dashboardDateFilter;
      return filter?.value ?? null;
    }
    case "relativePeriod": {
      const granularity =
        options.dateFieldGranularity?.[source.field] ?? source.unit;
      const anchorValue = resolveRelativePeriodAnchor(
        source,
        context,
        granularity,
      );
      if (anchorValue === null) {
        return null;
      }
      return shiftMetricDateBucket(anchorValue, source.unit, source.offset);
    }
    default:
      return null;
  }
}

export function resolveFilterBindingMap(
  bindings: Readonly<Record<string, FilterBindingSource>>,
  context: PageFilterContext,
  options: {
    readonly dateFieldGranularity?: Readonly<
      Record<string, MetricDateGranularity>
    >;
  } = {},
): Record<string, string | number | boolean | readonly string[]> | null {
  const resolved: Record<
    string,
    string | number | boolean | readonly string[]
  > = {};

  for (const [key, source] of Object.entries(bindings)) {
    const value = resolveFilterBindingSource(source, context, options);
    if (value === null) {
      return null;
    }
    resolved[key] = value;
  }

  return resolved;
}
