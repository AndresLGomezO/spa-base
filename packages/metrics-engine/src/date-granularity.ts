import { extractKeySlice } from "./metric-record-keys.js";
import type { MetricDateGranularity } from "./types.js";

function parseUtcDate(raw: unknown): Date | null {
  if (typeof raw !== "string" || raw.trim().length === 0) {
    return null;
  }

  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed;
}

const DATE_BUCKET_INPUT_PATTERNS: Readonly<
  Record<MetricDateGranularity, RegExp>
> = {
  day: /^\d{4}-\d{2}-\d{2}$/,
  month: /^\d{4}-\d{2}$/,
  year: /^\d{4}$/,
};

export function isMetricDateBucketInputComplete(
  raw: unknown,
  granularity: MetricDateGranularity,
): boolean {
  if (typeof raw !== "string") {
    return false;
  }

  const trimmed = raw.trim();
  if (trimmed.length === 0) {
    return false;
  }

  const normalized = normalizeMetricDateValue(trimmed, granularity);
  if (normalized === null) {
    return false;
  }

  if (DATE_BUCKET_INPUT_PATTERNS[granularity].test(trimmed)) {
    return true;
  }

  // ISO timestamps and full dates from entity fields still normalize cleanly.
  return trimmed.includes("-") && trimmed.length > 7;
}

export function normalizeMetricDateValue(
  raw: unknown,
  granularity: MetricDateGranularity,
): string | null {
  const date = parseUtcDate(raw);
  if (!date) {
    return null;
  }

  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");

  switch (granularity) {
    case "day":
      return `${year}-${month}-${day}`;
    case "month":
      return `${year}-${month}`;
    case "year":
      return String(year);
    default:
      return null;
  }
}

export function applyDateGranularityToSlice(
  record: Record<string, unknown>,
  fields: readonly string[],
  dateFieldGranularity:
    | Readonly<Record<string, MetricDateGranularity>>
    | undefined,
): Record<string, unknown> {
  const granularityMap = dateFieldGranularity ?? {};
  const slice = extractKeySlice(record, fields);

  for (const field of fields) {
    const granularity = granularityMap[field];
    if (!granularity || !(field in slice)) {
      continue;
    }

    const normalized = normalizeMetricDateValue(slice[field], granularity);
    if (normalized !== null) {
      slice[field] = normalized;
    }
  }

  return slice;
}

function parseMonthBucket(
  value: string,
): { year: number; month: number } | null {
  const match = /^(\d{4})-(\d{2})$/.exec(value.trim());
  if (!match) {
    return null;
  }
  const year = Number(match[1]);
  const month = Number(match[2]);
  if (month < 1 || month > 12) {
    return null;
  }
  return { year, month };
}

function parseYearBucket(value: string): number | null {
  const match = /^(\d{4})$/.exec(value.trim());
  return match ? Number(match[1]) : null;
}

function parseDayBucket(
  value: string,
): { year: number; month: number; day: number } | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!match) {
    return null;
  }
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31) {
    return null;
  }
  return { year, month, day };
}

export function shiftMetricDateBucket(
  value: string,
  unit: MetricDateGranularity,
  offset: number,
): string | null {
  switch (unit) {
    case "month": {
      const parsed = parseMonthBucket(value);
      if (!parsed) {
        return null;
      }
      const date = new Date(
        Date.UTC(parsed.year, parsed.month - 1 + offset, 1),
      );
      return normalizeMetricDateValue(date.toISOString(), "month");
    }
    case "year": {
      const year = parseYearBucket(value);
      if (year === null) {
        return null;
      }
      return String(year + offset);
    }
    case "day": {
      const parsed = parseDayBucket(value);
      if (!parsed) {
        return null;
      }
      const date = new Date(
        Date.UTC(parsed.year, parsed.month - 1, parsed.day + offset),
      );
      return normalizeMetricDateValue(date.toISOString(), "day");
    }
    default:
      return null;
  }
}

export function applyDateGranularityToQuerySlice(
  slice: Record<string, string | number | boolean>,
  fields: readonly string[],
  dateFieldGranularity:
    | Readonly<Record<string, MetricDateGranularity>>
    | undefined,
): Record<string, string | number | boolean> {
  const granularityMap = dateFieldGranularity ?? {};
  const next = { ...slice };

  for (const field of fields) {
    const granularity = granularityMap[field];
    if (!granularity || !(field in next)) {
      continue;
    }

    const normalized = normalizeMetricDateValue(next[field], granularity);
    if (normalized !== null) {
      next[field] = normalized;
    }
  }

  return next;
}
