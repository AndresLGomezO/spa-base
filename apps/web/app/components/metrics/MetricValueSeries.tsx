import { cn } from "@repo/theme/utils";
import { LayoutCard, Text } from "@repo/ui";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";

import type { ViewMetricSeriesWidget } from "@repo/entities";

import { usePermission } from "../../auth/usePermission.js";
import {
  buildMetricRowQueryFromBindings,
  type MetricBindingContext,
} from "../../lib/metric-binding-resolution.js";
import { useMetricDefinition } from "../../hooks/metrics/useMetricDefinition.js";
import { useMetricBatch } from "../../hooks/metrics/useMetricBatch.js";
import { formatPrimaryMetricValue } from "./format-metric-display-value.js";

interface MetricValueSeriesProps {
  readonly widget: ViewMetricSeriesWidget;
  readonly context?: MetricBindingContext;
}

export function MetricValueSeries({
  widget,
  context = {},
}: MetricValueSeriesProps) {
  const { t } = useTranslation("common");
  const canRead = usePermission("metricValue.read");
  const definitionQuery = useMetricDefinition(widget.metricDefinitionId);

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
                ? (formatPrimaryMetricValue(definition, row.values) ??
                  t("metrics.widget.empty"))
                : t("metrics.widget.empty")}
            </Text>
          </LayoutCard>
        ))}
      </div>
    </div>
  );
}
