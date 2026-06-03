import { createEmptyLayout } from "@repo/ui-builder-core";
import type { UiLayoutDocument } from "@repo/ui-builder-core";

import type {
  MetricWidgetPlacement,
  ViewMetricWidget,
} from "./metric-widget-types.js";

export const DEFAULT_METRIC_STRIP_COLUMN_COUNT = 4;

export function createDefaultMetricStripLayout(
  columnCount = DEFAULT_METRIC_STRIP_COLUMN_COUNT,
): UiLayoutDocument {
  const layout = createEmptyLayout(columnCount);
  return {
    root: layout.root,
  };
}

export function metricStripColumnCount(
  layout: UiLayoutDocument | undefined,
): number {
  return layout?.root.columnCount ?? DEFAULT_METRIC_STRIP_COLUMN_COUNT;
}

export function resolveWidgetPlacement(
  widget: ViewMetricWidget,
  index: number,
  columnCount: number,
): Required<Pick<MetricWidgetPlacement, "column">> & MetricWidgetPlacement {
  if (widget.placement) {
    return {
      column: widget.placement.column,
      row: widget.placement.row ?? 1,
      columnSpan: widget.placement.columnSpan ?? 1,
      rowSpan: widget.placement.rowSpan ?? 1,
      stackDirection: widget.placement.stackDirection,
    };
  }

  const column = (index % columnCount) + 1;
  const row = Math.floor(index / columnCount) + 1;
  return { column, row, columnSpan: 1, rowSpan: 1 };
}

export function clampWidgetPlacement(
  placement: MetricWidgetPlacement,
  columnCount: number,
): MetricWidgetPlacement {
  const column = Math.min(Math.max(1, placement.column), columnCount);
  const columnSpan = Math.min(
    Math.max(1, placement.columnSpan ?? 1),
    columnCount - column + 1,
  );
  return {
    ...placement,
    column,
    columnSpan,
    row: placement.row !== undefined ? Math.max(1, placement.row) : undefined,
    rowSpan:
      placement.rowSpan !== undefined
        ? Math.max(1, placement.rowSpan)
        : undefined,
  };
}

export function clampMetricWidgetsToStrip(
  widgets: readonly ViewMetricWidget[],
  columnCount: number,
): readonly ViewMetricWidget[] {
  return widgets.map((widget) => {
    if (!widget.placement) {
      return widget;
    }
    return {
      ...widget,
      placement: clampWidgetPlacement(widget.placement, columnCount),
    };
  });
}

export function migrateMetricWidgetsWithPlacement(
  widgets: readonly ViewMetricWidget[],
  columnCount: number,
): readonly ViewMetricWidget[] {
  return widgets.map((widget, index) => {
    if (widget.placement) {
      return {
        ...widget,
        placement: clampWidgetPlacement(widget.placement, columnCount),
      };
    }
    const resolved = resolveWidgetPlacement(widget, index, columnCount);
    return {
      ...widget,
      placement: {
        column: resolved.column,
        row: resolved.row,
        columnSpan: resolved.columnSpan,
        rowSpan: resolved.rowSpan,
      },
    };
  });
}

export function metricStripLayoutFromView(
  layout: UiLayoutDocument | undefined,
): UiLayoutDocument {
  return layout ?? createDefaultMetricStripLayout();
}

export function assertMetricWidgetsPlacement(
  widgets: readonly ViewMetricWidget[],
  stripLayout: UiLayoutDocument | undefined,
): void {
  const columnCount = metricStripColumnCount(stripLayout);
  for (const widget of widgets) {
    if (!widget.placement) {
      continue;
    }
    const { column, columnSpan = 1 } = widget.placement;
    if (column < 1 || column > columnCount) {
      throw new Error(
        `Metric widget "${widget.id}" placement.column must be between 1 and ${columnCount}.`,
      );
    }
    if (column + columnSpan - 1 > columnCount) {
      throw new Error(
        `Metric widget "${widget.id}" placement exceeds strip column count (${columnCount}).`,
      );
    }
  }
}

export function defaultPlacementForNewWidget(
  widgets: readonly ViewMetricWidget[],
  columnCount: number,
): MetricWidgetPlacement {
  let maxRow = 0;
  for (let index = 0; index < widgets.length; index += 1) {
    const placement = resolveWidgetPlacement(
      widgets[index]!,
      index,
      columnCount,
    );
    if (placement.column === 1) {
      maxRow = Math.max(maxRow, placement.row ?? 1);
    }
  }
  return { column: 1, row: maxRow + 1, columnSpan: 1, rowSpan: 1 };
}

export function placementCellKey(placement: MetricWidgetPlacement): string {
  const row = placement.row ?? 1;
  const columnSpan = placement.columnSpan ?? 1;
  const rowSpan = placement.rowSpan ?? 1;
  return `${placement.column}:${row}:${columnSpan}:${rowSpan}`;
}

export function findPlacementConflicts(
  widgets: readonly ViewMetricWidget[],
  columnCount: number,
  widgetId: string,
  placement: MetricWidgetPlacement,
): readonly string[] {
  const key = placementCellKey(placement);
  const conflicts: string[] = [];
  for (let index = 0; index < widgets.length; index += 1) {
    const widget = widgets[index]!;
    if (widget.id === widgetId) {
      continue;
    }
    const other = resolveWidgetPlacement(widget, index, columnCount);
    if (placementCellKey(other) === key) {
      conflicts.push(widget.id);
    }
  }
  return conflicts;
}
