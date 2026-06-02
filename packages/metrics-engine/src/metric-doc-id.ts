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

export function resolveMetricOwnerId(
  record: Record<string, unknown>,
): string | null {
  const ownerId = record.ownerId;
  if (typeof ownerId !== "string") {
    return null;
  }
  const trimmed = ownerId.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function buildMetricDocId(
  userId: string,
  group: Record<string, unknown>,
  dimensions: Record<string, unknown>,
): string {
  const payload = stableStringify({ userId, group, dimensions });
  return createHash("sha256").update(payload).digest("hex").slice(0, 32);
}

export interface MetricRowKeyInput {
  readonly userId: string;
  readonly group: Record<string, unknown>;
  readonly dimensions: Record<string, unknown>;
}

export interface MetricRowKey {
  readonly userId: string;
  readonly group: Record<string, unknown>;
  readonly dimensions: Record<string, unknown>;
  readonly docId: string;
}

export function buildMetricRowKey(input: MetricRowKeyInput): MetricRowKey {
  const userId = input.userId.trim();
  return {
    userId,
    group: input.group,
    dimensions: input.dimensions,
    docId: buildMetricDocId(userId, input.group, input.dimensions),
  };
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
