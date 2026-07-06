import type { ResolvedChartComponentConfig } from "@repo/ui-builder-core";

import type { MetricDefinitionRecord } from "../../../lib/api-client.js";
import { fetchMetricBatch } from "../../../lib/api-client.js";
import { buildMetricParameterValuesFromBindings } from "../../../lib/build-metric-parameter-values.js";
import { fetchMetricEvaluateCached } from "../../../lib/fetch-metric-evaluate-cached.js";
import {
  formatPrimaryMetricDisplayValue,
  readPrimaryMetricNumericValue,
} from "../../../components/metrics/format-metric-display-value.js";
import {
  buildMetricRowQueryFromBindings,
  type PageFilterContext,
} from "../../../lib/metric-binding-resolution.js";
import { resolveMetricDefinitionDocumentId } from "../../../lib/resolve-metric-definition-reference.js";

export interface ChartDonutData {
  readonly value: number;
  readonly maxValue: number;
  readonly centerLabel: string;
  readonly fillColor: string;
  readonly trackColor: string;
  readonly innerRadiusRatio: number;
  readonly showCenterLabel: boolean;
  readonly strokeWidth: number;
}

export function resolveMetricDefinitionForChart(
  metricDefinitionId: string,
  definitions: readonly MetricDefinitionRecord[],
): MetricDefinitionRecord | undefined {
  const resolvedId = resolveMetricDefinitionDocumentId(
    metricDefinitionId,
    definitions,
  );
  return definitions.find(
    (entry) =>
      entry.id === resolvedId ||
      entry.metricId === metricDefinitionId ||
      entry.id === metricDefinitionId,
  );
}

export function buildMetricValueChartQueryKey(
  dataSource: Extract<
    ResolvedChartComponentConfig["dataSource"],
    { type: "metricValue" }
  >,
  context: PageFilterContext,
): string {
  return JSON.stringify({
    metricDefinitionId: dataSource.metricDefinitionId,
    maxValue: dataSource.maxValue ?? 100,
    groupBindings: dataSource.groupBindings ?? {},
    dimensionBindings: dataSource.dimensionBindings ?? {},
    parameterBindings: dataSource.parameterBindings ?? {},
    context,
  });
}

function resolveDonutStyle(config: ResolvedChartComponentConfig): {
  readonly fillColor: string;
  readonly trackColor: string;
  readonly innerRadiusRatio: number;
  readonly showCenterLabel: boolean;
  readonly strokeWidth: number;
} {
  const seriesColor = config.series?.[0]?.color;
  return {
    fillColor:
      config.donut?.fillColor ??
      seriesColor ??
      "var(--color-primary, #6366f1)",
    trackColor:
      config.donut?.trackColor ??
      "color-mix(in oklch, var(--color-primary, #6366f1) 20%, transparent)",
    innerRadiusRatio: config.donut?.innerRadiusRatio ?? 0.72,
    showCenterLabel: config.donut?.showCenterLabel ?? true,
    strokeWidth: config.donut?.strokeWidth ?? 0,
  };
}

export function resolveDonutProgressValue(
  numericValue: number,
  definition: MetricDefinitionRecord,
  maxValue: number,
): number {
  if (definition.valueDisplayFormat === "percent") {
    // Percent metrics store decimal ratios (e.g. 0.3361); arc scale uses 0–maxValue points.
    return numericValue * 100;
  }
  return numericValue;
}

export function buildPreviewDonutData(
  config: ResolvedChartComponentConfig,
): ChartDonutData {
  const style = resolveDonutStyle(config);
  const maxValue =
    config.dataSource.type === "metricValue"
      ? (config.dataSource.maxValue ?? 100)
      : 100;

  return {
    value: maxValue * 0.42,
    maxValue,
    centerLabel: "42%",
    ...style,
  };
}

export async function fetchMetricValueDonutData(
  definition: MetricDefinitionRecord,
  config: ResolvedChartComponentConfig,
  context: PageFilterContext,
  options?: { readonly force?: boolean; readonly locale?: string },
): Promise<ChartDonutData | null> {
  if (config.dataSource.type !== "metricValue") {
    return null;
  }

  const dataSource = config.dataSource;
  const style = resolveDonutStyle(config);
  const maxValue = dataSource.maxValue ?? 100;

  let values: Record<string, number> | undefined;

  if (definition.computationMode === "computed") {
    const parameters = buildMetricParameterValuesFromBindings(
      definition,
      dataSource.parameterBindings ?? {},
      context,
    );
    if (parameters === null) {
      return null;
    }

    const result = await fetchMetricEvaluateCached(definition.id, parameters, {
      force: options?.force,
    });
    if (!result) {
      return null;
    }
    values = result.values;
  } else {
    const query = buildMetricRowQueryFromBindings(
      definition,
      {
        groupBindings: dataSource.groupBindings ?? {},
        dimensionBindings: dataSource.dimensionBindings ?? {},
      },
      context,
    );
    if (!query) {
      return null;
    }
    const rows = await fetchMetricBatch(definition.id, [query]);
    values = rows[0]?.values;
  }

  const numericValue = readPrimaryMetricNumericValue(definition, values);
  if (numericValue === null) {
    return null;
  }

  const centerLabel =
    formatPrimaryMetricDisplayValue(
      definition,
      values ?? {},
      options?.locale,
    ) ?? String(numericValue);

  return {
    value: resolveDonutProgressValue(numericValue, definition, maxValue),
    maxValue,
    centerLabel,
    ...style,
  };
}
