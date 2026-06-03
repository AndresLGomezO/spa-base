import { cn } from "@repo/theme/utils";
import type { UiLayoutDocument } from "@repo/ui-builder-core";
import { metricStripColumnCount } from "@repo/entities";

import type {
  SerializableEntityDefinition,
  ViewMetricWidget,
} from "@repo/entities";

import type { MetricBindingContext } from "../../lib/metric-binding-resolution.js";
import { metricStripGridStyle } from "./metric-strip-grid-styles.js";
import { MetricWidgetRenderer } from "./MetricWidgetRenderer.js";

interface EntityViewMetricsStripProps {
  readonly widgets: readonly ViewMetricWidget[];
  readonly stripLayout?: UiLayoutDocument;
  readonly entityDefinition: SerializableEntityDefinition;
  readonly context?: MetricBindingContext;
  readonly className?: string;
  readonly locale?: string;
  readonly previewMode?: boolean;
}

export function EntityViewMetricsStrip({
  widgets,
  stripLayout,
  entityDefinition,
  context,
  className,
  locale = "en",
  previewMode = false,
}: EntityViewMetricsStripProps) {
  if (widgets.length === 0) {
    return null;
  }

  const columnCount = metricStripColumnCount(stripLayout);
  const grid = metricStripGridStyle(stripLayout);
  const hasExplicitStripLayout = stripLayout !== undefined;
  const gapRule = stripLayout?.root.styles?.some(
    (rule) => rule.property === "gap",
  );

  return (
    <div
      className={cn(
        grid.className,
        !hasExplicitStripLayout &&
          "grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4",
        hasExplicitStripLayout && !gapRule && "gap-3",
        className,
      )}
      style={hasExplicitStripLayout ? grid.style : undefined}
    >
      {widgets.map((widget, index) => (
        <MetricWidgetRenderer
          key={widget.id}
          widget={widget}
          widgetIndex={index}
          columnCount={columnCount}
          stripLayout={stripLayout}
          entityDefinition={entityDefinition}
          context={context}
          locale={locale}
          previewMode={previewMode}
        />
      ))}
    </div>
  );
}
