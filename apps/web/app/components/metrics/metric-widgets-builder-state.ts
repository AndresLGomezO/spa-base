import type {
  MetricWidgetBindings,
  MetricWidgetPlacement,
  ViewMetricKpiWidget,
  ViewMetricSeriesWidget,
  ViewMetricWidget,
} from "@repo/entities";
import {
  createDefaultMetricStripLayout,
  defaultPlacementForNewWidget,
  metricStripLayoutFromView,
  metricStripColumnCount,
  migrateMetricWidgetLayout,
  migrateMetricWidgetLayouts,
  migrateMetricWidgetsWithPlacement,
} from "@repo/entities";
import type { UiLayoutDocument } from "@repo/ui-builder-core";

export {
  createDefaultMetricStripLayout,
  metricStripColumnCount,
  migrateMetricWidgetLayout,
};

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
  placement?: MetricWidgetPlacement,
): ViewMetricKpiWidget {
  return {
    id: "metric-widget-1",
    display: "kpi",
    metricDefinitionId,
    groupBindings: {},
    dimensionBindings: {},
    ...(placement ? { placement } : {}),
  };
}

export function createDefaultSeriesWidget(
  metricDefinitionId: string,
  placement?: MetricWidgetPlacement,
): ViewMetricSeriesWidget {
  return {
    id: "metric-widget-1",
    display: "series",
    metricDefinitionId,
    buckets: [createEmptyMetricBindings()],
    ...(placement ? { placement } : {}),
  };
}

export function viewMetricWidgetsFromView(
  widgets: readonly ViewMetricWidget[] | undefined,
  stripLayout?: UiLayoutDocument,
): readonly ViewMetricWidget[] {
  const list = widgets ?? [];
  if (list.length === 0) {
    return list;
  }
  const columnCount = metricStripColumnCount(stripLayout);
  return migrateMetricWidgetLayouts(
    migrateMetricWidgetsWithPlacement(list, columnCount),
  );
}

export function metricStripLayoutFromTableView(
  layout: UiLayoutDocument | undefined,
): UiLayoutDocument {
  return metricStripLayoutFromView(layout);
}

export function nextWidgetPlacement(
  widgets: readonly ViewMetricWidget[],
  stripLayout: UiLayoutDocument,
): MetricWidgetPlacement {
  return defaultPlacementForNewWidget(
    widgets,
    metricStripColumnCount(stripLayout),
  );
}
