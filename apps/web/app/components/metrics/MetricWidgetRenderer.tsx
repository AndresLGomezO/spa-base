import { cn } from "@repo/theme/utils";
import { RecursiveLayoutRenderer } from "@repo/ui-builder-renderer";
import {
  migrateMetricWidgetLayout,
  resolveWidgetPlacement,
} from "@repo/entities";
import type { UiLayoutDocument } from "@repo/ui-builder-core";

import type { MetricBindingContext } from "../../lib/metric-binding-resolution.js";
import type { SerializableEntityDefinition } from "@repo/entities";
import type { ViewMetricWidget } from "@repo/entities";

import { createMetricWidgetRenderContext } from "../../features/ui-builder/create-metric-widget-render-context.js";
import { applyMetricWidgetStyleWrapper } from "./apply-metric-widget-styles.js";
import {
  metricStripColumnWrapperStyle,
  metricWidgetGridPlacementStyle,
} from "./metric-strip-grid-styles.js";
import { MetricValueSeries } from "./MetricValueSeries.js";

interface MetricWidgetRendererProps {
  readonly widget: ViewMetricWidget;
  readonly widgetIndex: number;
  readonly columnCount: number;
  readonly stripLayout?: UiLayoutDocument;
  readonly entityDefinition: SerializableEntityDefinition;
  readonly context?: MetricBindingContext;
  readonly locale?: string;
  readonly previewMode?: boolean;
}

export function MetricWidgetRenderer({
  widget,
  widgetIndex,
  columnCount,
  stripLayout,
  entityDefinition,
  context,
  locale = "en",
  previewMode = false,
}: MetricWidgetRendererProps) {
  const resolved = migrateMetricWidgetLayout(widget);
  const widgetWrapper = applyMetricWidgetStyleWrapper(resolved.styles);
  const placement = resolveWidgetPlacement(resolved, widgetIndex, columnCount);
  const columnWrapper = metricStripColumnWrapperStyle(
    stripLayout,
    placement.column,
  );
  const style = {
    ...metricWidgetGridPlacementStyle(resolved, widgetIndex, columnCount),
    ...columnWrapper.style,
    ...widgetWrapper.style,
  };
  const cellClassName = cn(widgetWrapper.className, columnWrapper.className);

  if (resolved.display === "series") {
    return (
      <div className={cellClassName} style={style}>
        <MetricValueSeries
          widget={resolved}
          entityDefinition={entityDefinition}
          context={context}
          locale={locale}
          previewMode={previewMode}
        />
      </div>
    );
  }

  if (resolved.layout) {
    return (
      <div className={cellClassName} style={style}>
        <RecursiveLayoutRenderer
          layout={resolved.layout}
          context={createMetricWidgetRenderContext({
            widget: resolved,
            definition: entityDefinition,
            locale,
            context,
            usePreviewSamples: previewMode,
          })}
        />
      </div>
    );
  }

  return null;
}
