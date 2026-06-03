import { cn } from "@repo/theme/utils";
import { LayoutCard, Text } from "@repo/ui";
import { RecursiveLayoutRenderer } from "@repo/ui-builder-renderer";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";

import type {
  SerializableEntityDefinition,
  ViewMetricSeriesWidget,
} from "@repo/entities";
import type {
  MetricDefinitionRecord,
  MetricRow,
} from "../../lib/api-client.js";

import {
  buildMetricRowQueryFromBindings,
  type MetricBindingContext,
} from "../../lib/metric-binding-resolution.js";
import { createMetricWidgetRenderContext } from "../../features/ui-builder/create-metric-widget-render-context.js";
import { useCanReadMetricValues } from "../../hooks/metrics/useCanReadMetricValues.js";
import { useMetricDefinition } from "../../hooks/metrics/useMetricDefinition.js";
import { useMetricBatch } from "../../hooks/metrics/useMetricBatch.js";
import { formatPrimaryMetricDisplayValue } from "./format-metric-display-value.js";

interface MetricValueSeriesProps {
  readonly widget: ViewMetricSeriesWidget;
  readonly entityDefinition: SerializableEntityDefinition;
  readonly context?: MetricBindingContext;
  readonly locale?: string;
  readonly previewMode?: boolean;
}

function MetricSeriesBucketCell({
  widget,
  bucket,
  row,
  metricDefinition,
  entityDefinition,
  context,
  locale,
  previewMode,
}: {
  readonly widget: ViewMetricSeriesWidget;
  readonly bucket: ViewMetricSeriesWidget["buckets"][number];
  readonly row: MetricRow | null | undefined;
  readonly metricDefinition: MetricDefinitionRecord;
  readonly entityDefinition: SerializableEntityDefinition;
  readonly context: MetricBindingContext;
  readonly locale: string;
  readonly previewMode: boolean;
}) {
  const { t, i18n } = useTranslation("common");

  const query = useMemo(
    () => buildMetricRowQueryFromBindings(metricDefinition, bucket, context),
    [bucket, context, metricDefinition],
  );

  if (bucket.layout) {
    return (
      <RecursiveLayoutRenderer
        layout={bucket.layout}
        context={createMetricWidgetRenderContext({
          widget,
          definition: entityDefinition,
          locale,
          context,
          bucketBindings: bucket,
          bucketQuery: previewMode ? null : query,
          usePreviewSamples: previewMode,
        })}
      />
    );
  }

  return (
    <LayoutCard>
      <Text className="text-2xl font-semibold tabular-nums">
        {row
          ? (formatPrimaryMetricDisplayValue(
              metricDefinition,
              row.values,
              i18n.language,
            ) ?? t("metrics.widget.empty"))
          : t("metrics.widget.empty")}
      </Text>
    </LayoutCard>
  );
}

export function MetricValueSeries({
  widget,
  entityDefinition,
  context = {},
  locale = "en",
  previewMode = false,
}: MetricValueSeriesProps) {
  const { t } = useTranslation("common");
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
    queries: previewMode ? null : queries,
    enabled: canRead && definitionQuery.isSuccess && !previewMode,
  });

  if (!canRead) {
    return (
      <Text variant="muted" className="text-sm">
        {t("metrics.widget.forbidden")}
      </Text>
    );
  }

  if (!previewMode && (definitionQuery.isLoading || batchQuery.isLoading)) {
    return (
      <Text variant="muted" className="text-sm">
        {t("metrics.widget.loading")}
      </Text>
    );
  }

  const metricDefinition = definitionQuery.data;
  if (!metricDefinition) {
    return null;
  }

  const items = previewMode
    ? widget.buckets.map(() => null)
    : (batchQuery.data ?? []);
  const stackDirection = widget.placement?.stackDirection ?? "column";
  const bucketsHorizontal = stackDirection === "row";

  const chrome = widget.layout ? (
    <RecursiveLayoutRenderer
      layout={widget.layout}
      context={createMetricWidgetRenderContext({
        widget,
        definition: entityDefinition,
        locale,
        context,
        usePreviewSamples: previewMode,
      })}
    />
  ) : widget.label ? (
    <Text className="text-sm font-semibold">{widget.label}</Text>
  ) : null;

  return (
    <div className="flex flex-col gap-2">
      {chrome}
      <div
        className={cn(
          "gap-3",
          bucketsHorizontal
            ? "flex flex-wrap"
            : cn("grid", "sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"),
        )}
      >
        {widget.buckets.map((bucket, index) => (
          <MetricSeriesBucketCell
            key={`${widget.id}-bucket-${index}`}
            widget={widget}
            bucket={bucket}
            row={items[index]}
            metricDefinition={metricDefinition}
            entityDefinition={entityDefinition}
            context={context}
            locale={locale}
            previewMode={previewMode}
          />
        ))}
      </div>
    </div>
  );
}
