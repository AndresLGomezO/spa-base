import type { MetricBindingContext } from "../../lib/metric-binding-resolution.js";
import type { ViewMetricWidget } from "@repo/entities";

import { MetricValueDisplay } from "./MetricValueDisplay.js";
import { MetricValueSeries } from "./MetricValueSeries.js";

interface MetricWidgetRendererProps {
  readonly widget: ViewMetricWidget;
  readonly context?: MetricBindingContext;
}

export function MetricWidgetRenderer({
  widget,
  context,
}: MetricWidgetRendererProps) {
  if (widget.display === "series") {
    return <MetricValueSeries widget={widget} context={context} />;
  }

  return (
    <MetricValueDisplay
      metricDefinitionId={widget.metricDefinitionId}
      groupBindings={widget.groupBindings}
      dimensionBindings={widget.dimensionBindings}
      label={widget.label}
      context={context}
    />
  );
}
