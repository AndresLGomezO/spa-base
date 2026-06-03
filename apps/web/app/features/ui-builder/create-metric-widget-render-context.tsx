import type { MetricKpiComponentConfig } from "@repo/ui-builder-core";
import type { LayoutRenderContext } from "@repo/ui-builder-renderer";
import type {
  MetricWidgetBindings,
  SerializableEntityDefinition,
  ViewMetricWidget,
} from "@repo/entities";

import type { EntityCatalogEntry } from "../../entities/entity-catalog";
import { resolveLayoutSlotLabel } from "../../components/entity/resolve-layout-slot-display";
import { MetricValueDisplay } from "../../components/metrics/MetricValueDisplay";
import type { MetricBindingContext } from "../../lib/metric-binding-resolution.js";
import { createEntityLayoutRenderContext } from "./create-entity-layout-render-context.js";

export function createMetricWidgetRenderContext(options: {
  readonly widget: ViewMetricWidget;
  readonly definition: SerializableEntityDefinition;
  readonly locale: string;
  readonly context?: MetricBindingContext;
  readonly bucketBindings?: MetricWidgetBindings;
  readonly bucketQuery?: Parameters<typeof MetricValueDisplay>[0]["query"];
  readonly getDefinition?: (
    entityName: string,
  ) => EntityCatalogEntry | undefined;
  readonly usePreviewSamples?: boolean;
}): LayoutRenderContext {
  const {
    widget,
    definition,
    locale,
    context = {},
    bucketBindings,
    bucketQuery,
    getDefinition,
    usePreviewSamples = true,
  } = options;

  const metricDefinitionId = widget.metricDefinitionId;
  const fallbackBindings: MetricWidgetBindings =
    bucketBindings ??
    (widget.display === "kpi"
      ? {
          groupBindings: widget.groupBindings,
          dimensionBindings: widget.dimensionBindings,
        }
      : { groupBindings: {}, dimensionBindings: {} });

  const layoutImageContext = createEntityLayoutRenderContext({
    item: {},
    definition,
    locale,
    getDefinition,
    usePreviewPlaceholder: usePreviewSamples,
    usePreviewSamples,
  });

  return {
    mode: "listItem",
    data: {},
    locale,
    resolveField: () => undefined,
    resolveFieldLabel: (path) =>
      resolveLayoutSlotLabel(path, definition, getDefinition),
    resolvePreviewSampleValue: usePreviewSamples
      ? (fieldPath) =>
          resolveLayoutSlotLabel(fieldPath, definition, getDefinition) ??
          "Sample"
      : undefined,
    metricKpiRenderer: (config: MetricKpiComponentConfig) => (
      <MetricValueDisplay
        presentation="inline"
        metricDefinitionId={config.metricDefinitionId || metricDefinitionId}
        groupBindings={
          Object.keys(config.groupBindings).length > 0
            ? config.groupBindings
            : fallbackBindings.groupBindings
        }
        dimensionBindings={
          Object.keys(config.dimensionBindings).length > 0
            ? config.dimensionBindings
            : fallbackBindings.dimensionBindings
        }
        context={context}
        query={bucketQuery ?? null}
      />
    ),
    resolveImage: layoutImageContext.resolveImage,
    isImagePresent: layoutImageContext.isImagePresent,
  };
}
