import { createHash } from "node:crypto";

import { stableStringify } from "./stable-stringify.js";

export function extractKeySlice(
  record: Record<string, unknown>,
  fields: readonly string[],
): Record<string, unknown> {
  const slice: Record<string, unknown> = {};
  for (const field of fields) {
    if (field in record) {
      slice[field] = record[field];
    }
  }
  return slice;
}

export function buildMetricDocId(
  group: Record<string, unknown>,
  dimensions: Record<string, unknown>,
): string {
  const payload = stableStringify({ group, dimensions });
  return createHash("sha256").update(payload).digest("hex").slice(0, 32);
}

export function normalizeMetricFieldKey(field: string): string {
  return field.replace(/[^a-zA-Z0-9_]/g, "_");
}

export function sumKeyForField(field: string): string {
  return `sum_${normalizeMetricFieldKey(field)}`;
}

export function countKeyForField(field: string): string {
  return `count_${normalizeMetricFieldKey(field)}`;
}

export function avgKeyForField(field: string): string {
  return `avg_${normalizeMetricFieldKey(field)}`;
}

export function valueKeyForAggregation(
  operation: "SUM" | "COUNT" | "AVG",
  field?: string,
): readonly string[] {
  switch (operation) {
    case "SUM": {
      return [sumKeyForField(field ?? "")];
    }
    case "COUNT":
      if (!field) {
        return ["count"];
      }
      return [countKeyForField(field)];
    case "AVG": {
      const normalizedField = normalizeMetricFieldKey(field ?? "");
      return [
        sumKeyForField(normalizedField),
        countKeyForField(normalizedField),
      ];
    }
    default:
      return [];
  }
}
