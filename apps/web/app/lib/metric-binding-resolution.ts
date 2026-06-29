import type { MetricBindingSource } from "@repo/entities";
import type { MetricDateGranularity } from "@repo/metrics-engine/browser";
import { isMetricDateBucketInputComplete } from "@repo/metrics-engine/browser";

import type { MetricRowQuery } from "./api-client.js";
import {
  buildMetricRowQuery,
  type MetricQueryBindings,
} from "./metric-query-utils.js";
import type { MetricDefinitionRecord } from "./api-client.js";

export interface DashboardDateFilterContextValue {
  readonly value: string;
  readonly granularity: MetricDateGranularity;
  readonly param: string;
}

export interface MetricBindingContext {
  readonly record?: Record<string, unknown>;
  readonly listFilters?: Readonly<Record<string, readonly string[]>>;
  readonly routeParams?: Readonly<Record<string, string | undefined>>;
  readonly dashboardDateFilter?: DashboardDateFilterContextValue;
}

export function resolveMetricBindingSource(
  source: MetricBindingSource,
  context: MetricBindingContext,
): string | number | boolean | null {
  switch (source.type) {
    case "static": {
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

function fieldMatchesDashboardDateFilter(
  definition: MetricDefinitionRecord,
  field: string,
  filter: DashboardDateFilterContextValue,
): boolean {
  return definition.dateFieldGranularity?.[field] === filter.granularity;
}

function resolveDashboardDateFallback(
  definition: MetricDefinitionRecord,
  field: string,
  context: MetricBindingContext,
): string | null {
  const filter = context.dashboardDateFilter;
  if (!filter || !fieldMatchesDashboardDateFilter(definition, field, filter)) {
    return null;
  }

  return filter.value;
}

function resolveMetricBindingMap(
  bindings: Readonly<Record<string, MetricBindingSource>>,
  requiredFields: readonly string[],
  context: MetricBindingContext,
  definition: MetricDefinitionRecord,
): MetricQueryBindings | null {
  const resolved: MetricQueryBindings = {};

  for (const field of requiredFields) {
    const source = bindings[field];
    if (!source) {
      const fallback = resolveDashboardDateFallback(definition, field, context);
      if (fallback === null) {
        return null;
      }
      resolved[field] = fallback;
      continue;
    }

    let value = resolveMetricBindingSource(source, context);
    if (value === null) {
      const fallback = resolveDashboardDateFallback(definition, field, context);
      if (fallback === null) {
        return null;
      }
      value = fallback;
    }

    resolved[field] = value;
  }

  return resolved;
}

function areResolvedDateBindingsComplete(
  definition: MetricDefinitionRecord,
  groupBindings: MetricQueryBindings,
  dimensionBindings: MetricQueryBindings,
): boolean {
  const granularityMap = definition.dateFieldGranularity ?? {};

  for (const field of definition.groupBy) {
    const granularity = granularityMap[field];
    if (!granularity) {
      continue;
    }
    if (!isMetricDateBucketInputComplete(groupBindings[field], granularity)) {
      return false;
    }
  }

  for (const field of definition.dimensions) {
    const granularity = granularityMap[field];
    if (!granularity) {
      continue;
    }
    if (
      !isMetricDateBucketInputComplete(dimensionBindings[field], granularity)
    ) {
      return false;
    }
  }

  return true;
}

function applyDashboardDateOverride(
  definition: MetricDefinitionRecord,
  groupBindings: MetricQueryBindings,
  dimensionBindings: MetricQueryBindings,
  dashboardDateFilter: DashboardDateFilterContextValue | undefined,
): void {
  if (!dashboardDateFilter) {
    return;
  }

  for (const field of definition.groupBy) {
    if (
      fieldMatchesDashboardDateFilter(definition, field, dashboardDateFilter)
    ) {
      groupBindings[field] = dashboardDateFilter.value;
    }
  }

  for (const field of definition.dimensions) {
    if (
      fieldMatchesDashboardDateFilter(definition, field, dashboardDateFilter)
    ) {
      dimensionBindings[field] = dashboardDateFilter.value;
    }
  }
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
    definition,
  );
  if (!groupResolved) {
    return null;
  }

  const dimensionResolved = resolveMetricBindingMap(
    input.dimensionBindings,
    definition.dimensions,
    context,
    definition,
  );
  if (!dimensionResolved) {
    return null;
  }

  applyDashboardDateOverride(
    definition,
    groupResolved,
    dimensionResolved,
    context.dashboardDateFilter,
  );

  if (
    !areResolvedDateBindingsComplete(
      definition,
      groupResolved,
      dimensionResolved,
    )
  ) {
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
