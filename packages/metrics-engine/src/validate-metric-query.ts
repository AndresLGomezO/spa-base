import { z } from "zod";

import { applyDateGranularityToQuerySlice } from "./date-granularity.js";
import type { MetricDefinitionRecord } from "./types.js";

const metricQueryValueSchema = z.union([z.string(), z.number(), z.boolean()]);

export const metricRowQuerySchema = z.object({
  group: z.record(z.string(), metricQueryValueSchema).default({}),
  dimensions: z.record(z.string(), metricQueryValueSchema).default({}),
});

export type MetricRowQuery = z.infer<typeof metricRowQuerySchema>;

export const metricBatchQuerySchema = z.object({
  queries: z.array(metricRowQuerySchema).min(1).max(50),
});

export type MetricBatchQuery = z.infer<typeof metricBatchQuerySchema>;

export class MetricQueryValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MetricQueryValidationError";
  }
}

function assertExactKeys(
  label: "group" | "dimensions",
  provided: Record<string, unknown>,
  expectedFields: readonly string[],
): Record<string, string | number | boolean> {
  const providedKeys = Object.keys(provided).sort();
  const expectedKeys = [...expectedFields].sort();

  if (providedKeys.length !== expectedKeys.length) {
    throw new MetricQueryValidationError(
      `${label} must include exactly fields: ${expectedKeys.join(", ") || "(none)"}.`,
    );
  }

  for (let index = 0; index < expectedKeys.length; index += 1) {
    if (providedKeys[index] !== expectedKeys[index]) {
      throw new MetricQueryValidationError(
        `${label} must include exactly fields: ${expectedKeys.join(", ") || "(none)"}.`,
      );
    }
  }

  const normalized: Record<string, string | number | boolean> = {};
  for (const field of expectedFields) {
    const value = provided[field];
    if (
      typeof value !== "string" &&
      typeof value !== "number" &&
      typeof value !== "boolean"
    ) {
      throw new MetricQueryValidationError(
        `${label}.${field} must be a string, number, or boolean.`,
      );
    }
    normalized[field] = value;
  }

  return normalized;
}

export function validateMetricQueryAgainstDefinition(
  definition: MetricDefinitionRecord,
  query: MetricRowQuery,
): {
  readonly group: Record<string, unknown>;
  readonly dimensions: Record<string, unknown>;
} {
  const group = applyDateGranularityToQuerySlice(
    assertExactKeys("group", query.group, definition.groupBy),
    definition.groupBy,
    definition.dateFieldGranularity,
  );
  const dimensions = applyDateGranularityToQuerySlice(
    assertExactKeys("dimensions", query.dimensions, definition.dimensions),
    definition.dimensions,
    definition.dateFieldGranularity,
  );

  return { group, dimensions };
}
