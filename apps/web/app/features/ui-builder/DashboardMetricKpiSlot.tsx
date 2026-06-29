import { useMemo } from "react";

import type {
  MetricKpiComponentConfig,
  MetricKpiPresentation,
} from "@repo/ui-builder-core";

import { MetricValueDisplay } from "../../components/metrics/MetricValueDisplay";
import { useActiveMetricDefinitions } from "../../hooks/metrics/useActiveMetricDefinitions";
import { resolveMetricDefinitionDocumentId } from "../../lib/resolve-metric-definition-reference";
import { listFiltersForEntity } from "./list-filters-for-entity";
import type { DashboardDateFilterContextValue } from "../../lib/metric-binding-resolution";

interface DashboardMetricKpiSlotProps {
  readonly config: MetricKpiComponentConfig;
  readonly presentation?: MetricKpiPresentation;
  readonly pageFilters?: Readonly<Record<string, readonly string[]>>;
  readonly dashboardDateFilter?: DashboardDateFilterContextValue;
}

export function DashboardMetricKpiSlot({
  config,
  presentation,
  pageFilters = {},
  dashboardDateFilter,
}: DashboardMetricKpiSlotProps) {
  const activeDefinitionsQuery = useActiveMetricDefinitions(
    config.metricDefinitionId.trim().length > 0,
  );
  const resolvedMetricDefinitionId = useMemo(
    () =>
      resolveMetricDefinitionDocumentId(
        config.metricDefinitionId,
        activeDefinitionsQuery.data ?? [],
      ),
    [activeDefinitionsQuery.data, config.metricDefinitionId],
  );

  const listFilters = useMemo(() => {
    const sourceModel = activeDefinitionsQuery.data?.find(
      (item) => item.id === resolvedMetricDefinitionId,
    )?.sourceModel;

    return listFiltersForEntity(sourceModel ?? "", pageFilters);
  }, [activeDefinitionsQuery.data, pageFilters, resolvedMetricDefinitionId]);

  return (
    <MetricValueDisplay
      presentation="inline"
      metricDefinitionId={config.metricDefinitionId}
      groupBindings={config.groupBindings}
      dimensionBindings={config.dimensionBindings}
      context={{
        record: {},
        listFilters,
        routeParams: dashboardDateFilter
          ? { [dashboardDateFilter.param]: dashboardDateFilter.value }
          : {},
        dashboardDateFilter,
      }}
      className={presentation?.className}
      style={presentation?.style}
      valueClassName={presentation?.valueClassName}
      valueStyle={presentation?.valueStyle}
      textSize={presentation?.textSize}
    />
  );
}
