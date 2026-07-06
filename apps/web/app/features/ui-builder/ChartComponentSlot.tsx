import { useMemo } from "react";
import { DonutChart, LineAreaChart } from "@repo/ui-charts";
import {
  filterComponentInnerStyleRules,
  layoutInlineStyleFromStyleRules,
  splitStyleRuleClasses,
  type ChartComponentConfig,
} from "@repo/ui-builder-core";
import { cn } from "@repo/theme/utils";

import type { EntityCatalogEntry } from "../../entities/entity-catalog.js";
import { useChartDefinitions } from "../../hooks/useChartDefinitions.js";
import type { PageFilterContext } from "../../lib/metric-binding-resolution.js";
import { resolveChartComponentConfigFromCatalog } from "./resolve-chart-component-config.js";
import { useChartData } from "./chart-data/useChartData.js";

interface ChartComponentSlotProps {
  readonly config: ChartComponentConfig;
  readonly context?: PageFilterContext;
  readonly catalog?: readonly EntityCatalogEntry[];
  readonly previewMode?: boolean;
}

export function ChartComponentSlot({
  config,
  context = {},
  catalog = [],
  previewMode = false,
}: ChartComponentSlotProps) {
  const chartDefinitionsQuery = useChartDefinitions(true);
  const definitions = useMemo(
    () => chartDefinitionsQuery.data ?? [],
    [chartDefinitionsQuery.data],
  );

  const resolvedConfig = useMemo(
    () => resolveChartComponentConfigFromCatalog(config, definitions),
    [config, definitions],
  );

  const innerStyles = filterComponentInnerStyleRules(config.styles);
  const { containerClassName } = splitStyleRuleClasses(innerStyles);
  const containerStyle = layoutInlineStyleFromStyleRules(innerStyles);

  const { series, donutData, loading } = useChartData({
    config: resolvedConfig ?? {
      kind: "chart",
      chartDefinitionId: config.chartDefinitionId,
      chartType: "line",
      dataSource: { type: "static", points: [] },
    },
    context,
    catalog,
    previewMode,
  });

  const ariaLabel = useMemo(() => {
    if (config.ariaLabel?.trim()) {
      return config.ariaLabel.trim();
    }
    return series.map((entry) => entry.label).join(", ");
  }, [config.ariaLabel, series]);

  if (!resolvedConfig) {
    return (
      <div
        className={cn(
          "text-muted-foreground flex h-full w-full items-center justify-center text-sm",
          containerClassName,
        )}
        style={containerStyle}
      >
        {chartDefinitionsQuery.isLoading
          ? "Loading…"
          : "Select a chart definition"}
      </div>
    );
  }

  return (
    <div
      className={cn("h-full w-full min-h-0", containerClassName)}
      style={containerStyle}
    >
      {resolvedConfig.chartType === "donut" && donutData ? (
        <DonutChart
          value={donutData.value}
          maxValue={donutData.maxValue}
          fillColor={donutData.fillColor}
          trackColor={donutData.trackColor}
          innerRadiusRatio={donutData.innerRadiusRatio}
          centerLabel={donutData.centerLabel}
          showCenterLabel={donutData.showCenterLabel}
          strokeWidth={donutData.strokeWidth}
          ariaLabel={ariaLabel}
          loading={loading}
          className="h-full w-full"
        />
      ) : resolvedConfig.chartType === "line" ||
        resolvedConfig.chartType === "area" ? (
        <LineAreaChart
          chartType={resolvedConfig.chartType}
          series={series}
          xAxis={resolvedConfig.xAxis}
          yAxis={resolvedConfig.yAxis}
          legend={resolvedConfig.legend}
          grid={resolvedConfig.grid}
          animation={resolvedConfig.animation}
          ariaLabel={ariaLabel}
          loading={loading}
          className="h-full w-full"
        />
      ) : null}
    </div>
  );
}
