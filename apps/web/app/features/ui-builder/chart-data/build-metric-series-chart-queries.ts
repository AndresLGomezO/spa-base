import type {
  ResolvedChartComponentConfig,
  ChartMetricSeriesStep,
  MetricBindingSource,
} from "@repo/ui-builder-core";

import type { MetricRowQuery } from "../../../lib/api-client.js";
import { buildMetricParameterValuesFromBindings } from "../../../lib/build-metric-parameter-values.js";
import {
  buildMetricRowQueryFromBindings,
  resolveMetricBindingSource,
} from "../../../lib/metric-binding-resolution.js";
import type { MetricDefinitionRecord } from "../../../lib/api-client.js";
import type { PageFilterContext } from "../../../lib/metric-binding-resolution.js";
import { interpolateChartSeriesOffsets } from "./chart-series-step.js";

type MetricSeriesAggregatedBucket = {
  readonly mode: "aggregated";
  readonly query: MetricRowQuery;
  readonly label: string;
};

type MetricSeriesComputedBucket = {
  readonly mode: "computed";
  readonly parameters: Readonly<Record<string, string | number | boolean>>;
  readonly label: string;
};

type MetricSeriesChartBucket =
  | MetricSeriesAggregatedBucket
  | MetricSeriesComputedBucket;

function resolveSeriesBucketLabel(
  field: string,
  offset: number,
  unit: ChartMetricSeriesStep["unit"],
  context: PageFilterContext,
): string {
  const binding: MetricBindingSource = {
    type: "relativePeriod",
    field,
    anchor: "dashboardDateFilter",
    offset,
    unit,
  };

  const anchorValue = resolveMetricBindingSource(binding, context, {
    dateFieldGranularity: { [field]: unit },
  });

  if (typeof anchorValue === "string" && anchorValue.trim().length > 0) {
    return anchorValue;
  }

  return String(offset);
}

function buildRelativePeriodBinding(
  field: string,
  offset: number,
  unit: ChartMetricSeriesStep["unit"],
): MetricBindingSource {
  return {
    type: "relativePeriod",
    field,
    anchor: "dashboardDateFilter",
    offset,
    unit,
  };
}

export function buildMetricSeriesChartQueries(
  definition: MetricDefinitionRecord,
  dataSource: Extract<
    ResolvedChartComponentConfig["dataSource"],
    { type: "metricSeries" }
  >,
  context: PageFilterContext,
): readonly MetricSeriesChartBucket[] {
  const offsets = interpolateChartSeriesOffsets(
    dataSource.step,
    dataSource.bucketCount,
  );
  const groupBindings = dataSource.groupBindings ?? {};
  const baseParameterBindings = dataSource.parameterBindings ?? {};
  const baseDimensionBindings = dataSource.dimensionBindings ?? {};
  const isComputed = definition.computationMode === "computed";

  return offsets.map((offset) => {
    const label = resolveSeriesBucketLabel(
      dataSource.dimensionField,
      offset,
      dataSource.step.unit,
      context,
    );

    if (isComputed) {
      const parameterBindings: Record<string, MetricBindingSource> = {
        ...baseParameterBindings,
        [dataSource.dimensionField]: buildRelativePeriodBinding(
          dataSource.dimensionField,
          offset,
          dataSource.step.unit,
        ),
      };

      const parameters =
        buildMetricParameterValuesFromBindings(
          definition,
          parameterBindings,
          context,
        ) ?? {};

      return {
        mode: "computed",
        parameters,
        label,
      };
    }

    const dimensionBindings: Record<string, MetricBindingSource> = {
      ...baseDimensionBindings,
      [dataSource.dimensionField]: buildRelativePeriodBinding(
        dataSource.dimensionField,
        offset,
        dataSource.step.unit,
      ),
    };

    const query = buildMetricRowQueryFromBindings(
      definition,
      {
        groupBindings,
        dimensionBindings,
        queryParameterBindings: baseParameterBindings,
      },
      context,
    );

    return {
      mode: "aggregated",
      query: query ?? { group: {}, dimensions: {} },
      label,
    };
  });
}

export function buildMetricSeriesChartQueryKey(
  metricDefinitionId: string,
  dataSource: Extract<
    ResolvedChartComponentConfig["dataSource"],
    { type: "metricSeries" }
  >,
  context: PageFilterContext,
): string {
  return JSON.stringify({
    metricDefinitionId,
    dataSource,
    dashboardDateFilter: context.dashboardDateFilter,
    listFilters: context.listFilters,
    routeParams: context.routeParams,
  });
}
