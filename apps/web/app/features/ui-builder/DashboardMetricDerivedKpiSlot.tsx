import { useMemo } from "react";

import type {
  MetricDerivedKpiComponentConfig,
  MetricKpiPresentation,
} from "@repo/ui-builder-core";
import {
  extractMetricDefinitionIds,
  resolveMetricDerivedExpression,
} from "@repo/ui-builder-core";

import { MetricDerivedValueDisplay } from "../../components/metrics/MetricDerivedValueDisplay";
import { useActiveMetricDefinitions } from "../../hooks/metrics/useActiveMetricDefinitions";
import { resolveMetricDefinitionDocumentId } from "../../lib/resolve-metric-definition-reference";
import { listFiltersForEntity } from "./list-filters-for-entity";

interface DashboardMetricDerivedKpiSlotProps {
  readonly config: MetricDerivedKpiComponentConfig;
  readonly presentation?: MetricKpiPresentation;
  readonly pageFilters?: Readonly<Record<string, readonly string[]>>;
}

export function DashboardMetricDerivedKpiSlot({
  config,
  presentation,
  pageFilters = {},
}: DashboardMetricDerivedKpiSlotProps) {
  const primaryMetricId = extractMetricDefinitionIds(
    resolveMetricDerivedExpression(config),
  )[0];
  const activeDefinitionsQuery = useActiveMetricDefinitions(
    Boolean(primaryMetricId?.trim()),
  );
  const resolvedMetricDefinitionId = useMemo(
    () =>
      primaryMetricId
        ? resolveMetricDefinitionDocumentId(
            primaryMetricId,
            activeDefinitionsQuery.data ?? [],
          )
        : undefined,
    [activeDefinitionsQuery.data, primaryMetricId],
  );

  const listFilters = useMemo(() => {
    const sourceModel = activeDefinitionsQuery.data?.find(
      (item) => item.id === resolvedMetricDefinitionId,
    )?.sourceModel;

    return listFiltersForEntity(sourceModel ?? "", pageFilters);
  }, [activeDefinitionsQuery.data, pageFilters, resolvedMetricDefinitionId]);

  return (
    <MetricDerivedValueDisplay
      presentation="inline"
      config={config}
      context={{ record: {}, listFilters }}
      className={presentation?.className}
      style={presentation?.style}
      valueClassName={presentation?.valueClassName}
      valueStyle={presentation?.valueStyle}
      textSize={presentation?.textSize}
    />
  );
}
