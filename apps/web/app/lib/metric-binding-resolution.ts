import type { FilterBindingSource } from "@repo/entities";
import {
  resolveFilterBindingSource as resolveSharedFilterBindingSource,
  resolveFilterBindingMap as resolveSharedFilterBindingMap,
  type PageFilterContext,
  type DashboardDateFilterContextValue,
} from "@repo/entity-queries";
import type { MetricDateGranularity } from "@repo/metrics-engine/browser";
import { isMetricDateBucketInputComplete } from "@repo/metrics-engine/browser";

import type { MetricRowQuery } from "./api-client.js";
import {
  buildMetricRowQuery,
  type MetricQueryBindings,
} from "./metric-query-utils.js";
import type { MetricDefinitionRecord } from "./api-client.js";

export type { DashboardDateFilterContextValue, PageFilterContext };

/** @deprecated Use PageFilterContext */
export type MetricBindingContext = PageFilterContext;

export function resolveMetricBindingSource(
  source: FilterBindingSource,
  context: PageFilterContext,
  options: {
    readonly dateFieldGranularity?: Readonly<
      Record<string, MetricDateGranularity>
    >;
  } = {},
): string | number | boolean | readonly string[] | null {
  return resolveSharedFilterBindingSource(source, context, options);
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
  return resolveSharedFilterBindingMap(bindings, context, options);
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
  context: PageFilterContext,
): string | null {
  const filter = context.dashboardDateFilter;
  if (!filter || !fieldMatchesDashboardDateFilter(definition, field, filter)) {
    return null;
  }

  return filter.value;
}

function resolveMetricBindingMap(
  bindings: Readonly<Record<string, FilterBindingSource>>,
  requiredFields: readonly string[],
  context: PageFilterContext,
  definition: MetricDefinitionRecord,
): MetricQueryBindings | null {
  const resolved: MetricQueryBindings = {};
  const granularityMap = definition.dateFieldGranularity ?? {};

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

    let value = resolveMetricBindingSource(source, context, {
      dateFieldGranularity: granularityMap,
    });
    if (value === null) {
      const fallback = resolveDashboardDateFallback(definition, field, context);
      if (fallback === null) {
        return null;
      }
      value = fallback;
    }

    if (
      typeof value !== "string" &&
      typeof value !== "number" &&
      typeof value !== "boolean"
    ) {
      return null;
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
    readonly groupBindings: Readonly<Record<string, FilterBindingSource>>;
    readonly dimensionBindings: Readonly<Record<string, FilterBindingSource>>;
    readonly queryParameterBindings?: Readonly<
      Record<string, FilterBindingSource>
    >;
  },
  context: PageFilterContext,
): MetricRowQuery | null {
  const granularityMap = definition.dateFieldGranularity ?? {};
  const parameterValues = input.queryParameterBindings
    ? resolveFilterBindingMap(input.queryParameterBindings, context, {
        dateFieldGranularity: granularityMap,
      })
    : null;

  const mergedGroupBindings = { ...input.groupBindings };
  const mergedDimensionBindings = { ...input.dimensionBindings };

  if (parameterValues) {
    for (const field of definition.groupBy) {
      const value = parameterValues[field];
      if (value !== undefined && mergedGroupBindings[field] === undefined) {
        mergedGroupBindings[field] = { type: "static", value };
      }
    }
    for (const field of definition.dimensions) {
      const value = parameterValues[field];
      if (value !== undefined && mergedDimensionBindings[field] === undefined) {
        mergedDimensionBindings[field] = { type: "static", value };
      }
    }
  }
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
    mergedGroupBindings,
    definition.groupBy,
    context,
    definition,
  );
  if (!groupResolved) {
    return null;
  }

  const dimensionResolved = resolveMetricBindingMap(
    mergedDimensionBindings,
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
