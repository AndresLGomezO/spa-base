import {
  createEmptyLayout,
  createLayoutId,
  type UiLayoutDocument,
} from "@repo/ui-builder-core";

import type {
  MetricWidgetBindings,
  ViewMetricKpiWidget,
  ViewMetricSeriesWidget,
  ViewMetricWidget,
} from "./metric-widget-types.js";

export function createDefaultMetricKpiWidgetLayout(
  metricDefinitionId: string,
  bindings?: MetricWidgetBindings,
  label?: string,
): UiLayoutDocument {
  const layout = createEmptyLayout(1);
  const column = layout.root.columns[0];
  if (!column) {
    return layout;
  }

  return {
    root: {
      ...layout.root,
      columns: [
        {
          ...column,
          rows: [
            {
              type: "component" as const,
              id: createLayoutId("row"),
              component: {
                kind: "metric-kpi" as const,
                metricDefinitionId,
                groupBindings: bindings?.groupBindings ?? {},
                dimensionBindings: bindings?.dimensionBindings ?? {},
                ...(label?.trim() ? { label: label.trim() } : {}),
              },
            },
          ],
        },
      ],
    },
  };
}

export function createDefaultMetricSeriesWidgetLayout(
  label?: string,
): UiLayoutDocument {
  const layout = createEmptyLayout(1);
  const column = layout.root.columns[0];
  if (!column) {
    return layout;
  }

  const rows = label?.trim()
    ? [
        {
          type: "component" as const,
          id: createLayoutId("row"),
          component: {
            kind: "text" as const,
            primary: { type: "static" as const, value: label },
            label: { show: true, text: label },
            styles: [{ property: "fontWeight" as const, value: "bold" }],
          },
        },
      ]
    : [];

  return {
    root: {
      ...layout.root,
      columns: [{ ...column, rows }],
    },
  };
}

export function createDefaultMetricSeriesBucketLayout(
  metricDefinitionId: string,
  bindings?: MetricWidgetBindings,
): UiLayoutDocument {
  const layout = createEmptyLayout(1);
  const column = layout.root.columns[0];
  if (!column) {
    return layout;
  }

  return {
    root: {
      ...layout.root,
      columns: [
        {
          ...column,
          rows: [
            {
              type: "component" as const,
              id: createLayoutId("row"),
              component: {
                kind: "metric-kpi" as const,
                metricDefinitionId,
                groupBindings: bindings?.groupBindings ?? {},
                dimensionBindings: bindings?.dimensionBindings ?? {},
              },
            },
          ],
        },
      ],
    },
  };
}

function migrateKpiWidget(widget: ViewMetricKpiWidget): ViewMetricKpiWidget {
  if (widget.layout) {
    return widget;
  }

  return {
    ...widget,
    layout: createDefaultMetricKpiWidgetLayout(
      widget.metricDefinitionId,
      {
        groupBindings: widget.groupBindings,
        dimensionBindings: widget.dimensionBindings,
      },
      widget.label,
    ),
  };
}

function migrateSeriesWidget(
  widget: ViewMetricSeriesWidget,
): ViewMetricSeriesWidget {
  const layout =
    widget.layout ?? createDefaultMetricSeriesWidgetLayout(widget.label);

  const buckets = widget.buckets.map((bucket) => {
    if (bucket.layout) {
      return bucket;
    }
    return {
      ...bucket,
      layout: createDefaultMetricSeriesBucketLayout(
        widget.metricDefinitionId,
        bucket,
      ),
    };
  });

  return {
    ...widget,
    layout,
    buckets,
  };
}

export function migrateMetricWidgetLayout(
  widget: ViewMetricWidget,
): ViewMetricWidget {
  if (widget.display === "kpi") {
    return migrateKpiWidget(widget);
  }
  return migrateSeriesWidget(widget);
}

export function migrateMetricWidgetLayouts(
  widgets: readonly ViewMetricWidget[],
): readonly ViewMetricWidget[] {
  return widgets.map((widget) => migrateMetricWidgetLayout(widget));
}

export function metricWidgetHasLayout(widget: ViewMetricWidget): boolean {
  if (widget.display === "kpi") {
    return Boolean(widget.layout);
  }
  return (
    Boolean(widget.layout) &&
    widget.buckets.every((bucket) => Boolean(bucket.layout))
  );
}
