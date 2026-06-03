import { cn } from "@repo/theme/utils";
import { LayoutCard, Text } from "@repo/ui";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";

import type { ViewMetricSeriesWidget } from "@repo/entities";

import {
  buildMetricRowQueryFromBindings,
  type MetricBindingContext,
} from "../../lib/metric-binding-resolution.js";
import { useCanReadMetricValues } from "../../hooks/metrics/useCanReadMetricValues.js";
import { useMetricDefinition } from "../../hooks/metrics/useMetricDefinition.js";
import { useMetricBatch } from "../../hooks/metrics/useMetricBatch.js";
import { formatPrimaryMetricDisplayValue } from "./format-metric-display-value.js";

interface MetricValueSeriesProps {
  readonly widget: ViewMetricSeriesWidget;
  readonly context?: MetricBindingContext;
}

export function MetricValueSeries({
  widget,
  context = {},
}: MetricValueSeriesProps) {
  const { t, i18n } = useTranslation("common");
  const definitionQuery = useMetricDefinition(widget.metricDefinitionId);
  const canRead = useCanReadMetricValues(definitionQuery.data?.sourceModel);

  const queries = useMemo(() => {
    if (!definitionQuery.data) {
      return null;
    }
    return widget.buckets
      .map((bucket) =>
        buildMetricRowQueryFromBindings(definitionQuery.data!, bucket, context),
      )
      .filter((query): query is NonNullable<typeof query> => query !== null);
  }, [context, definitionQuery.data, widget.buckets]);

  const batchQuery = useMetricBatch({
    metricDefinitionId: widget.metricDefinitionId,
    sourceModel: definitionQuery.data?.sourceModel,
    queries,
    enabled: canRead && definitionQuery.isSuccess,
  });

  if (!canRead) {
    return (
      <Text variant="muted" className="text-sm">
        {t("metrics.widget.forbidden")}
      </Text>
    );
  }

  if (definitionQuery.isLoading || batchQuery.isLoading) {
    return (
      <Text variant="muted" className="text-sm">
        {t("metrics.widget.loading")}
      </Text>
    );
  }

  const definition = definitionQuery.data;
  if (!definition) {
    return null;
  }

  const title = widget.label ?? definition.name;
  const items = batchQuery.data ?? [];

  return (
    <div className="flex flex-col gap-2">
      <Text className="text-sm font-semibold">{title}</Text>
      <div
        className={cn(
          "grid gap-3",
          "sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4",
        )}
      >
        {items.map((row, index) => (
          <LayoutCard key={`${widget.id}-bucket-${index}`}>
            <Text className="text-2xl font-semibold tabular-nums">
              {row
                ? (formatPrimaryMetricDisplayValue(
                    definition,
                    row.values,
                    i18n.language,
                  ) ?? t("metrics.widget.empty"))
                : t("metrics.widget.empty")}
            </Text>
          </LayoutCard>
        ))}
      </div>
    </div>
  );
}
