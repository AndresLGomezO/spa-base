import type {
  MetricWidgetBindings,
  ViewMetricKpiWidget,
  ViewMetricSeriesWidget,
  ViewMetricWidget,
} from "@repo/entities";

const WIDGET_ID_SUFFIX = /^metric-widget-(\d+)$/;

export function allocateMetricWidgetId(
  widgets: readonly { readonly id: string }[],
): string {
  const used = new Set(widgets.map((widget) => widget.id));
  let maxNumeric = 0;

  for (const id of used) {
    const match = WIDGET_ID_SUFFIX.exec(id);
    if (match) {
      maxNumeric = Math.max(maxNumeric, Number.parseInt(match[1]!, 10));
    }
  }

  let candidate = maxNumeric + 1;
  while (used.has(`metric-widget-${candidate}`)) {
    candidate += 1;
  }

  return `metric-widget-${candidate}`;
}

export function createEmptyMetricBindings(): MetricWidgetBindings {
  return {
    groupBindings: {},
    dimensionBindings: {},
  };
}

export function createDefaultKpiWidget(
  metricDefinitionId: string,
): ViewMetricKpiWidget {
  return {
    id: "metric-widget-1",
    display: "kpi",
    metricDefinitionId,
    groupBindings: {},
    dimensionBindings: {},
  };
}

export function createDefaultSeriesWidget(
  metricDefinitionId: string,
): ViewMetricSeriesWidget {
  return {
    id: "metric-widget-1",
    display: "series",
    metricDefinitionId,
    buckets: [createEmptyMetricBindings()],
  };
}

export function viewMetricWidgetsFromView(
  widgets: readonly ViewMetricWidget[] | undefined,
): readonly ViewMetricWidget[] {
  return widgets ?? [];
}
