import type { MetricDateGranularity } from "@repo/metrics-engine/browser";
import {
  normalizeMetricDateValue,
  shiftMetricDateBucket,
} from "@repo/metrics-engine/browser";

import type {
  EntityQueryFilterNode,
  EntityQueryFilterValue,
  EntityQueryParameter,
  EntityQueryParameterBound,
} from "./types.js";

function startOfUtcMonth(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

function endOfUtcMonth(date: Date): Date {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0, 23, 59, 59, 999),
  );
}

function startOfUtcDay(date: Date): Date {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
}

function endOfUtcDay(date: Date): Date {
  return new Date(
    Date.UTC(
      date.getUTCFullYear(),
      date.getUTCMonth(),
      date.getUTCDate(),
      23,
      59,
      59,
      999,
    ),
  );
}

function startOfUtcYear(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
}

function endOfUtcYear(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), 11, 31, 23, 59, 59, 999));
}

function parseDateBucket(
  bucket: string,
  granularity: MetricDateGranularity,
): Date | null {
  switch (granularity) {
    case "month": {
      const match = /^(\d{4})-(\d{2})$/.exec(bucket.trim());
      if (!match) {
        return null;
      }
      const month = Number(match[2]);
      if (month < 1 || month > 12) {
        return null;
      }
      return new Date(Date.UTC(Number(match[1]), month - 1, 1));
    }
    case "year": {
      const match = /^(\d{4})$/.exec(bucket.trim());
      return match ? new Date(Date.UTC(Number(match[1]), 0, 1)) : null;
    }
    case "day": {
      const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(bucket.trim());
      if (!match) {
        return null;
      }
      return new Date(
        Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])),
      );
    }
    default:
      return null;
  }
}

function parseMonthBucketParts(
  bucket: string,
): { readonly year: number; readonly month: number } | null {
  const match = /^(\d{4})-(\d{2})$/.exec(bucket.trim());
  if (!match) {
    return null;
  }
  const year = Number(match[1]);
  const month = Number(match[2]);
  if (!Number.isFinite(year) || month < 1 || month > 12) {
    return null;
  }
  return { year, month };
}

/** Day-of-month cap for month-to-date windows (matches chart MTD alignment). */
export function resolveMonthToDateReferenceDay(
  bucket: string,
  now: Date = new Date(),
): number {
  const parts = parseMonthBucketParts(bucket);
  if (!parts) {
    return 0;
  }

  const { year, month } = parts;
  const todayYear = now.getUTCFullYear();
  const todayMonth = now.getUTCMonth() + 1;
  const anchorKey = year * 12 + month;
  const todayKey = todayYear * 12 + todayMonth;

  if (anchorKey > todayKey) {
    return 0;
  }

  if (anchorKey === todayKey) {
    return now.getUTCDate();
  }

  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

export function resolveDateBucketParameterBound(
  bucket: string,
  granularity: MetricDateGranularity,
  bound: EntityQueryParameterBound,
  now: Date = new Date(),
): string | null {
  const date = parseDateBucket(bucket, granularity);
  if (!date) {
    return null;
  }

  switch (bound) {
    case "value":
      return bucket;
    case "start":
      switch (granularity) {
        case "month":
          return startOfUtcMonth(date).toISOString();
        case "year":
          return startOfUtcYear(date).toISOString();
        case "day":
          return startOfUtcDay(date).toISOString();
      }
      break;
    case "end":
      switch (granularity) {
        case "month":
          return endOfUtcMonth(date).toISOString();
        case "year":
          return endOfUtcYear(date).toISOString();
        case "day":
          return endOfUtcDay(date).toISOString();
      }
      break;
    case "endToDate":
      switch (granularity) {
        case "month": {
          const parts = parseMonthBucketParts(bucket);
          if (!parts) {
            return null;
          }
          const referenceDay = resolveMonthToDateReferenceDay(bucket, now);
          if (referenceDay <= 0) {
            return endOfUtcMonth(date).toISOString();
          }
          const lastDay = new Date(
            Date.UTC(parts.year, parts.month, 0),
          ).getUTCDate();
          const cappedDay = Math.min(referenceDay, lastDay);
          return endOfUtcDay(
            new Date(Date.UTC(parts.year, parts.month - 1, cappedDay)),
          ).toISOString();
        }
        case "year":
          return endOfUtcYear(date).toISOString();
        case "day":
          return endOfUtcDay(date).toISOString();
      }
      break;
  }

  return null;
}

export function buildIntrinsicQueryParameterMap(
  record: Record<string, unknown>,
  parameters: readonly EntityQueryParameter[],
): Record<string, unknown> {
  const values: Record<string, unknown> = {};

  for (const parameter of parameters) {
    if (parameter.valueType === "dateBucket") {
      const field = parameter.field;
      const granularity = parameter.granularity ?? "month";
      if (!field) {
        continue;
      }
      const normalized = normalizeMetricDateValue(record[field], granularity);
      if (normalized !== null) {
        values[parameter.name] = normalized;
      }
      continue;
    }

    if (parameter.field) {
      values[parameter.name] = record[parameter.field];
    }
  }

  return values;
}

export function resolveQueryParameterFilterValue(
  value: Extract<EntityQueryFilterValue, { type: "parameter" }>,
  parameters: readonly EntityQueryParameter[],
  parameterValues: Readonly<Record<string, unknown>>,
  options: { readonly now?: Date } = {},
): unknown {
  const parameter = parameters.find((entry) => entry.name === value.name);
  if (!parameter) {
    return undefined;
  }

  const raw = parameterValues[value.name];
  if (raw === undefined) {
    return undefined;
  }

  if (parameter.valueType === "dateBucket") {
    const granularity = parameter.granularity ?? "month";
    const bound = value.bound ?? "value";
    if (typeof raw !== "string") {
      return undefined;
    }
    const bucket =
      value.offset !== undefined && value.unit !== undefined
        ? shiftMetricDateBucket(raw, value.unit, value.offset)
        : raw;
    if (bucket === null) {
      return undefined;
    }
    return resolveDateBucketParameterBound(
      bucket,
      granularity,
      bound,
      options.now ?? new Date(),
    );
  }

  if (parameter.valueType === "stringList") {
    if (!Array.isArray(raw) || raw.length === 0) {
      return undefined;
    }
    const values = raw.filter(
      (entry): entry is string =>
        typeof entry === "string" && entry.trim().length > 0,
    );
    return values.length > 0 ? values : undefined;
  }

  return raw;
}

function collectParameterNamesFromNode(
  node: EntityQueryFilterNode,
  names: Set<string>,
): void {
  if (node.type === "condition") {
    if (node.value.type === "parameter") {
      names.add(node.value.name);
    }
    return;
  }

  for (const child of node.children) {
    collectParameterNamesFromNode(child, names);
  }
}

export function validateQueryParameterReferences(
  filter: EntityQueryFilterNode,
  parameters: readonly EntityQueryParameter[],
): string | null {
  const declared = new Set(parameters.map((parameter) => parameter.name));
  const referenced = new Set<string>();
  collectParameterNamesFromNode(filter, referenced);

  for (const name of referenced) {
    if (!declared.has(name)) {
      return `Unknown query parameter "${name}".`;
    }
  }

  for (const name of referenced) {
    const parameter = parameters.find((entry) => entry.name === name);
    if (!parameter) {
      continue;
    }
    // bound validation happens at condition level during refine
  }

  return null;
}
