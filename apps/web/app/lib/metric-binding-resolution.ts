import type { MetricBindingSource } from "@repo/entities";

import type { MetricRowQuery } from "./api-client.js";
import {
  buildMetricRowQuery,
  type MetricQueryBindings,
} from "./metric-query-utils.js";
import type { MetricDefinitionRecord } from "./api-client.js";

export interface MetricBindingContext {
  readonly record?: Record<string, unknown>;
  readonly listFilters?: Readonly<Record<string, readonly string[]>>;
  readonly routeParams?: Readonly<Record<string, string | undefined>>;
}

export function resolveMetricBindingSource(
  source: MetricBindingSource,
  context: MetricBindingContext,
): string | number | boolean | null {
  switch (source.type) {
    case "static":
      return source.value;
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
      const parsed = Number(first);
      if (!Number.isNaN(parsed) && String(parsed) === first) {
        return parsed;
      }
      if (first === "true") {
        return true;
      }
      if (first === "false") {
        return false;
      }
      return first;
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
    default:
      return null;
  }
}

function resolveMetricBindingMap(
  bindings: Readonly<Record<string, MetricBindingSource>>,
  requiredFields: readonly string[],
  context: MetricBindingContext,
): MetricQueryBindings | null {
  const resolved: MetricQueryBindings = {};

  for (const field of requiredFields) {
    const source = bindings[field];
    if (!source) {
      return null;
    }
    const value = resolveMetricBindingSource(source, context);
    if (value === null) {
      return null;
    }
    resolved[field] = value;
  }

  return resolved;
}

export function buildMetricRowQueryFromBindings(
  definition: MetricDefinitionRecord,
  input: {
    readonly groupBindings: Readonly<Record<string, MetricBindingSource>>;
    readonly dimensionBindings: Readonly<Record<string, MetricBindingSource>>;
  },
  context: MetricBindingContext,
): MetricRowQuery | null {
  if (definition.groupBy.length === 0 && definition.dimensions.length === 0) {
    try {
      return buildMetricRowQuery(definition, {
        groupBindings: {},
        dimensionBindings: {},
      });
    } catch {
      return null;
    }
  }

  const groupResolved = resolveMetricBindingMap(
    input.groupBindings,
    definition.groupBy,
    context,
  );
  if (!groupResolved) {
    return null;
  }

  const dimensionResolved = resolveMetricBindingMap(
    input.dimensionBindings,
    definition.dimensions,
    context,
  );
  if (!dimensionResolved) {
    return null;
  }

  try {
    return buildMetricRowQuery(definition, {
      groupBindings: groupResolved,
      dimensionBindings: dimensionResolved,
    });
  } catch {
    return null;
  }
}
