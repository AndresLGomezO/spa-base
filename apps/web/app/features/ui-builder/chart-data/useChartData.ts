import { useQuery } from "@tanstack/react-query";
import { useCallback, useMemo } from "react";

import type { ResolvedChartComponentConfig } from "@repo/ui-builder-core";
import type { ChartRenderSeries } from "@repo/ui-charts";

import type { EntityCatalogEntry } from "../../../entities/entity-catalog.js";
import { fetchMetricBatch } from "../../../lib/api-client.js";
import { fetchMetricEvaluateCached } from "../../../lib/fetch-metric-evaluate-cached.js";
import { readPrimaryMetricNumericValue } from "../../../components/metrics/format-metric-display-value.js";
import type { PageFilterContext } from "../../../lib/metric-binding-resolution.js";
import { resolveMetricDefinitionDocumentId } from "../../../lib/resolve-metric-definition-reference.js";
import { useActiveMetricDefinitions } from "../../../hooks/metrics/useActiveMetricDefinitions.js";
import { useMetricReadAccess } from "../../../hooks/metrics/useCanReadMetricValues.js";
import { loadEntityQueryRowsCached } from "../../../hooks/useEntityQueryRows.js";
import {
  entityQueryRowsQueryKey,
  queryClient,
} from "../../../query/query-client.js";
import {
  buildMetricSeriesChartQueries,
  buildMetricSeriesChartQueryKey,
} from "./build-metric-series-chart-queries.js";
import {
  buildEntityQueryChartKey,
  resolveEntityQueryChartSeries,
} from "./resolve-entity-query-chart-series.js";
import {
  bucketEntityQueryTimeSeriesRows,
  buildEntityQueryRowsFetchKey,
  entityQueryTimeSeriesIsConfigured,
} from "./resolve-entity-query-time-series.js";
import {
  mapStaticPointsToRenderSeries,
  resolvePreviewChartSeries,
} from "./map-chart-render-series.js";
import {
  buildMetricValueChartQueryKey,
  buildPreviewDonutData,
  fetchMetricValueDonutData,
  resolveMetricDefinitionForChart,
  type ChartDonutData,
} from "./resolve-metric-value-chart-data.js";

interface UseChartDataInput {
  readonly config: ResolvedChartComponentConfig;
  readonly context?: PageFilterContext;
  readonly catalog?: readonly EntityCatalogEntry[];
  readonly previewMode?: boolean;
  /** Bumps react-query cache keys so manual refresh re-fetches live chart data. */
  readonly refreshKey?: number;
}

interface UseChartDataResult {
  readonly series: readonly ChartRenderSeries[];
  readonly donutData: ChartDonutData | null;
  readonly loading: boolean;
  readonly error: Error | null;
  readonly refetch: () => Promise<void>;
}

function resolveStaticSeries(
  config: ResolvedChartComponentConfig,
): readonly ChartRenderSeries[] {
  if (config.dataSource.type !== "static") {
    return resolvePreviewChartSeries(config.series);
  }
  return mapStaticPointsToRenderSeries(config.dataSource.points, config.series);
}

export function useChartData(input: UseChartDataInput): UseChartDataResult {
  const {
    config,
    context = {},
    catalog = [],
    previewMode = false,
    refreshKey = 0,
  } = input;
  const definitionsQuery = useActiveMetricDefinitions();
  const definitions = definitionsQuery.data ?? [];
  const previewSeries = useMemo(
    () => resolvePreviewChartSeries(config.series),
    [config.series],
  );

  const staticSeries = useMemo(
    () =>
      config.dataSource.type === "static"
        ? resolveStaticSeries(config)
        : previewSeries,
    [config, previewSeries],
  );

  const metricDefinition =
    config.dataSource.type === "metricSeries" ||
    config.dataSource.type === "metricValue"
      ? resolveMetricDefinitionForChart(
          config.dataSource.metricDefinitionId,
          definitions,
        )
      : undefined;

  const metricValueDataSource =
    config.dataSource.type === "metricValue" ? config.dataSource : null;

  const metricValueQuery = useQuery({
    queryKey: [
      "chart-metric-value",
      refreshKey,
      metricValueDataSource
        ? buildMetricValueChartQueryKey(metricValueDataSource, context)
        : "disabled",
    ],
    queryFn: async () => {
      if (!metricDefinition || !metricValueDataSource) {
        return buildPreviewDonutData(config);
      }

      return (
        (await fetchMetricValueDonutData(metricDefinition, config, context, {
          force: refreshKey > 0,
        })) ?? buildPreviewDonutData(config)
      );
    },
    enabled:
      config.chartType === "donut" &&
      config.dataSource.type === "metricValue" &&
      Boolean(metricDefinition) &&
      !previewMode,
  });

  const metricQueries =
    config.dataSource.type === "metricSeries" && metricDefinition
      ? buildMetricSeriesChartQueries(
          metricDefinition,
          config.dataSource,
          context,
        )
      : [];

  const canReadMetric = useMetricReadAccess(metricDefinition?.sourceModel);

  const metricSeriesDataSource =
    config.dataSource.type === "metricSeries" ? config.dataSource : null;

  const metricQuery = useQuery({
    queryKey: [
      "chart-metric-series",
      refreshKey,
      metricSeriesDataSource
        ? buildMetricSeriesChartQueryKey(
            metricSeriesDataSource.metricDefinitionId,
            metricSeriesDataSource,
            context,
          )
        : "disabled",
    ],
    queryFn: async () => {
      if (
        !metricDefinition ||
        !metricSeriesDataSource ||
        metricQueries.length === 0
      ) {
        return previewSeries;
      }

      const resolvedId = resolveMetricDefinitionDocumentId(
        metricSeriesDataSource.metricDefinitionId,
        definitions,
      );
      if (!resolvedId) {
        return previewSeries;
      }

      if (metricDefinition.computationMode === "computed") {
        const forceRefresh = refreshKey > 0;
        const results = await Promise.all(
          metricQueries.map((entry) =>
            entry.mode === "computed"
              ? fetchMetricEvaluateCached(resolvedId, entry.parameters, {
                  force: forceRefresh,
                })
              : Promise.resolve(null),
          ),
        );

        const points = metricQueries.map((entry, index) => ({
          x: entry.label,
          y:
            readPrimaryMetricNumericValue(
              metricDefinition,
              results[index]?.values,
            ) ?? 0,
        }));

        return mapStaticPointsToRenderSeries(points, config.series);
      }

      const rows = await fetchMetricBatch(
        resolvedId,
        metricQueries
          .filter((entry) => entry.mode === "aggregated")
          .map((entry) => entry.query),
      );

      const aggregatedBuckets = metricQueries.filter(
        (entry) => entry.mode === "aggregated",
      );
      const points = aggregatedBuckets.map((entry, index) => ({
        x: entry.label,
        y:
          readPrimaryMetricNumericValue(
            metricDefinition,
            rows[index]?.values,
          ) ?? 0,
      }));

      return mapStaticPointsToRenderSeries(points, config.series);
    },
    enabled:
      config.dataSource.type === "metricSeries" &&
      Boolean(metricDefinition) &&
      canReadMetric &&
      !previewMode,
  });

  const entityQueryDataSource =
    config.dataSource.type === "entityQuery" ? config.dataSource : null;
  const entityQueryUsesTimeSeries = Boolean(entityQueryDataSource?.timeSeries);
  const entityQueryFetchKey =
    entityQueryDataSource && entityQueryUsesTimeSeries
      ? buildEntityQueryRowsFetchKey(entityQueryDataSource, context)
      : null;

  const entityQueryRowsQuery = useQuery({
    queryKey: [
      "chart-entity-query-rows",
      refreshKey,
      entityQueryFetchKey ?? "disabled",
    ],
    queryFn: () =>
      loadEntityQueryRowsCached(entityQueryDataSource!, catalog, context, {
        force: refreshKey > 0,
      }),
    enabled:
      entityQueryFetchKey !== null &&
      !previewMode &&
      entityQueryTimeSeriesIsConfigured(entityQueryDataSource!),
  });

  const timeSeriesSeries = useMemo(() => {
    if (!entityQueryDataSource?.timeSeries) {
      return previewSeries;
    }
    if (entityQueryRowsQuery.data === undefined) {
      return previewSeries;
    }
    return bucketEntityQueryTimeSeriesRows(
      entityQueryRowsQuery.data,
      entityQueryDataSource,
      context,
      config.series,
    );
  }, [
    config.series,
    context,
    entityQueryDataSource,
    entityQueryRowsQuery.data,
    previewSeries,
  ]);

  const entityQuery = useQuery({
    queryKey: [
      "chart-entity-query",
      refreshKey,
      entityQueryDataSource
        ? buildEntityQueryChartKey(entityQueryDataSource, context)
        : "disabled",
    ],
    queryFn: () => {
      if (!entityQueryDataSource) {
        return previewSeries;
      }
      return resolveEntityQueryChartSeries(
        entityQueryDataSource,
        catalog,
        context,
        config.series,
      );
    },
    enabled:
      entityQueryDataSource !== null &&
      !entityQueryUsesTimeSeries &&
      !previewMode &&
      Boolean(entityQueryDataSource.entityQueryDefinitionId.trim()),
  });

  const refetch = useCallback(async () => {
    if (
      config.chartType === "donut" &&
      config.dataSource.type === "metricValue"
    ) {
      await metricValueQuery.refetch();
      return;
    }
    if (config.dataSource.type === "metricSeries") {
      await metricQuery.refetch();
      return;
    }
    if (config.dataSource.type === "entityQuery") {
      if (entityQueryUsesTimeSeries) {
        if (entityQueryFetchKey) {
          await queryClient.invalidateQueries({
            queryKey: entityQueryRowsQueryKey(entityQueryFetchKey),
          });
        }
        await entityQueryRowsQuery.refetch();
        return;
      }
      await entityQuery.refetch();
    }
  }, [
    config.chartType,
    config.dataSource.type,
    entityQuery,
    entityQueryFetchKey,
    entityQueryRowsQuery,
    entityQueryUsesTimeSeries,
    metricQuery,
    metricValueQuery,
  ]);

  const previewDonutData = useMemo(
    () => (config.chartType === "donut" ? buildPreviewDonutData(config) : null),
    [config],
  );

  if (config.chartType === "donut") {
    if (previewMode) {
      return {
        series: previewSeries,
        donutData: previewDonutData,
        loading: false,
        error: null,
        refetch,
      };
    }

    if (config.dataSource.type === "metricValue") {
      return {
        series: previewSeries,
        donutData: metricValueQuery.data ?? previewDonutData,
        loading: metricValueQuery.isLoading,
        error:
          metricValueQuery.error instanceof Error
            ? metricValueQuery.error
            : null,
        refetch,
      };
    }
  }

  if (config.dataSource.type === "static") {
    return {
      series: staticSeries,
      donutData: null,
      loading: false,
      error: null,
      refetch,
    };
  }

  if (previewMode) {
    return {
      series: previewSeries,
      donutData: null,
      loading: false,
      error: null,
      refetch,
    };
  }

  if (config.dataSource.type === "metricSeries") {
    return {
      series: metricQuery.data ?? previewSeries,
      donutData: null,
      loading: metricQuery.isLoading,
      error: metricQuery.error instanceof Error ? metricQuery.error : null,
      refetch,
    };
  }

  if (config.dataSource.type === "entityQuery") {
    if (entityQueryUsesTimeSeries) {
      return {
        series: timeSeriesSeries,
        donutData: null,
        loading: entityQueryRowsQuery.isLoading,
        error:
          entityQueryRowsQuery.error instanceof Error
            ? entityQueryRowsQuery.error
            : null,
        refetch,
      };
    }

    return {
      series: entityQuery.data ?? previewSeries,
      donutData: null,
      loading: entityQuery.isLoading,
      error: entityQuery.error instanceof Error ? entityQuery.error : null,
      refetch,
    };
  }

  return {
    series: previewSeries,
    donutData: null,
    loading: false,
    error: null,
    refetch,
  };
}
