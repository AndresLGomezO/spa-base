import {
  applyDateGranularityToQuerySlice,
  validateMetricQueryAgainstDefinition,
  valueKeyForAggregation,
  type MetricRowQuery,
} from "@repo/metrics-engine/browser";
import type {
  MetricAggregationOperation,
  MetricDateGranularity,
  MetricDefinitionRecord,
} from "@repo/metrics-engine/browser";

import type { MetricRowQuery as ClientMetricRowQuery } from "./api-client.js";

export type MetricQueryBindings = Record<string, string | number | boolean>;

export class MetricQueryBindingsError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MetricQueryBindingsError";
  }
}

type MetricDefinitionQueryShape = {
  readonly groupBy: readonly string[];
  readonly dimensions: readonly string[];
  readonly dateFieldGranularity?: Readonly<
    Record<string, MetricDateGranularity>
  >;
};

export function listRequiredMetricQueryFields(
  definition: MetricDefinitionQueryShape,
): {
  readonly groupBy: readonly string[];
  readonly dimensions: readonly string[];
} {
  return {
    groupBy: definition.groupBy,
    dimensions: definition.dimensions,
  };
}

function rejectExtraBindings(
  fields: readonly string[],
  bindings: MetricQueryBindings,
  label: "group" | "dimensions",
): void {
  const allowed = new Set(fields);
  for (const key of Object.keys(bindings)) {
    if (!allowed.has(key)) {
      throw new MetricQueryBindingsError(
        `${label} bindings include unknown field "${key}".`,
      );
    }
  }
}

function pickBindings(
  fields: readonly string[],
  bindings: MetricQueryBindings,
  label: "group" | "dimensions",
): Record<string, string | number | boolean> {
  const slice: Record<string, string | number | boolean> = {};
  const missing: string[] = [];

  for (const field of fields) {
    if (!(field in bindings)) {
      missing.push(field);
      continue;
    }

    const value = bindings[field];
    if (
      typeof value !== "string" &&
      typeof value !== "number" &&
      typeof value !== "boolean"
    ) {
      throw new MetricQueryBindingsError(
        `${label}.${field} must be a string, number, or boolean.`,
      );
    }
    slice[field] = value;
  }

  if (missing.length > 0) {
    throw new MetricQueryBindingsError(
      `${label} bindings must include: ${missing.join(", ")}.`,
    );
  }

  return slice;
}

export function buildMetricRowQuery(
  definition: MetricDefinitionQueryShape,
  input: {
    readonly groupBindings: MetricQueryBindings;
    readonly dimensionBindings: MetricQueryBindings;
  },
): ClientMetricRowQuery {
  rejectExtraBindings(definition.groupBy, input.groupBindings, "group");
  rejectExtraBindings(
    definition.dimensions,
    input.dimensionBindings,
    "dimensions",
  );

  const dateFieldGranularity = definition.dateFieldGranularity ?? {};

  const query: MetricRowQuery = {
    group: applyDateGranularityToQuerySlice(
      pickBindings(definition.groupBy, input.groupBindings, "group"),
      definition.groupBy,
      dateFieldGranularity,
    ),
    dimensions: applyDateGranularityToQuerySlice(
      pickBindings(
        definition.dimensions,
        input.dimensionBindings,
        "dimensions",
      ),
      definition.dimensions,
      dateFieldGranularity,
    ),
  };

  validateMetricQueryAgainstDefinition(
    definition as MetricDefinitionRecord,
    query,
  );
  return query;
}

export function chunkMetricQueries(
  queries: readonly ClientMetricRowQuery[],
  maxSize = 50,
): readonly (readonly ClientMetricRowQuery[])[] {
  if (maxSize < 1) {
    throw new Error("maxSize must be at least 1.");
  }

  const chunks: ClientMetricRowQuery[][] = [];
  for (let index = 0; index < queries.length; index += maxSize) {
    chunks.push(queries.slice(index, index + maxSize));
  }
  return chunks;
}

export function formatMetricValueKey(
  operation: MetricAggregationOperation,
  field?: string,
): readonly string[] {
  return valueKeyForAggregation(operation, field);
}
