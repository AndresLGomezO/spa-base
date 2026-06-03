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
