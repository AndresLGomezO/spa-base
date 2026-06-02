import { cn } from "@repo/theme/utils";

import type { ViewMetricWidget } from "@repo/entities";

import type { MetricBindingContext } from "../../lib/metric-binding-resolution.js";
import { MetricWidgetRenderer } from "./MetricWidgetRenderer.js";

interface EntityViewMetricsStripProps {
  readonly widgets: readonly ViewMetricWidget[];
  readonly context?: MetricBindingContext;
  readonly className?: string;
}

export function EntityViewMetricsStrip({
  widgets,
  context,
  className,
}: EntityViewMetricsStripProps) {
  if (widgets.length === 0) {
    return null;
  }

  return (
    <div
      className={cn(
        "grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4",
        className,
      )}
    >
      {widgets.map((widget) => (
        <MetricWidgetRenderer
          key={widget.id}
          widget={widget}
          context={context}
        />
      ))}
    </div>
  );
}
