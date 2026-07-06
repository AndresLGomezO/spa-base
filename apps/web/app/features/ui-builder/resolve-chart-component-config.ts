import type {
  ChartComponentConfig,
  ChartDataSource,
  MetricBindingSource,
  ResolvedChartComponentConfig,
} from "@repo/ui-builder-core";

import type { ChartDefinitionRecord } from "../../lib/api-client.js";
import { resolveChartDefinitionRecord } from "../../lib/resolve-chart-definition-reference.js";

function mergeParameterBindings(
  base: Readonly<Record<string, MetricBindingSource>> | undefined,
  overlay: Readonly<Record<string, MetricBindingSource>> | undefined,
): Readonly<Record<string, MetricBindingSource>> | undefined {
  if (!base && !overlay) {
    return undefined;
  }
  if (!overlay) {
    return base;
  }
  if (!base) {
    return overlay;
  }
  return { ...base, ...overlay };
}

function mergeDataSourceParameterBindings(
  dataSource: ChartDataSource,
  instanceBindings: Readonly<Record<string, MetricBindingSource>> | undefined,
): ChartDataSource {
  if (!instanceBindings || Object.keys(instanceBindings).length === 0) {
    return dataSource;
  }

  switch (dataSource.type) {
    case "static":
      return dataSource;
    case "metricSeries":
      return {
        ...dataSource,
        parameterBindings: mergeParameterBindings(
          dataSource.parameterBindings,
          instanceBindings,
        ),
      };
    case "entityQuery":
      return {
        ...dataSource,
        parameterBindings: mergeParameterBindings(
          dataSource.parameterBindings,
          instanceBindings,
        ),
      };
  }
}

export function resolveChartComponentConfig(
  config: ChartComponentConfig,
  definition: ChartDefinitionRecord,
): ResolvedChartComponentConfig {
  return {
    kind: "chart",
    chartDefinitionId: config.chartDefinitionId,
    chartType: definition.chartType,
    ...(definition.displayMode !== undefined
      ? { displayMode: definition.displayMode }
      : {}),
    dataSource: mergeDataSourceParameterBindings(
      definition.dataSource,
      config.parameterBindings,
    ),
    ...(definition.series !== undefined ? { series: definition.series } : {}),
    ...(definition.xAxis !== undefined ? { xAxis: definition.xAxis } : {}),
    ...(definition.yAxis !== undefined ? { yAxis: definition.yAxis } : {}),
    ...(definition.legend !== undefined ? { legend: definition.legend } : {}),
    ...(definition.grid !== undefined ? { grid: definition.grid } : {}),
    ...(definition.animation !== undefined
      ? { animation: definition.animation }
      : {}),
    ...(config.styles !== undefined ? { styles: config.styles } : {}),
    ...(config.ariaLabel !== undefined ? { ariaLabel: config.ariaLabel } : {}),
  };
}

export function resolveChartComponentConfigFromCatalog(
  config: ChartComponentConfig,
  definitions: readonly ChartDefinitionRecord[],
): ResolvedChartComponentConfig | undefined {
  const definition = resolveChartDefinitionRecord(
    config.chartDefinitionId,
    definitions,
  );
  if (!definition) {
    return undefined;
  }
  return resolveChartComponentConfig(config, definition);
}
