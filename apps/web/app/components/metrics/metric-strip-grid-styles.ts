import type { CSSProperties } from "react";
import type { MetricWidgetPlacement, ViewMetricWidget } from "@repo/entities";
import { resolveWidgetPlacement } from "@repo/entities";
import type { UiLayoutDocument } from "@repo/ui-builder-core";
import {
  gapPxFromStyles,
  resolvePageSlotWrapper,
  resolveStyleRules,
} from "@repo/ui-builder-core";

export function metricStripGridStyle(
  stripLayout: UiLayoutDocument | undefined,
): { className: string; style: CSSProperties } {
  const columnCount = stripLayout?.root.columnCount ?? 4;
  const wrapper = resolvePageSlotWrapper(stripLayout?.root.styles);
  const gapPx = gapPxFromStyles(stripLayout?.root.styles);

  return {
    className: wrapper.className,
    style: {
      ...wrapper.style,
      display: "grid",
      gridTemplateColumns: `repeat(${columnCount}, minmax(0, 1fr))`,
      ...(gapPx !== undefined ? { gap: `${gapPx}px` } : {}),
    },
  };
}

/** Styles from `metricStripLayout.root.columns[placementColumn - 1]`. */
export function metricStripColumnWrapperStyle(
  stripLayout: UiLayoutDocument | undefined,
  placementColumn: number,
): { className: string; style: CSSProperties } {
  const column = stripLayout?.root.columns[placementColumn - 1];
  if (!column?.styles?.length) {
    return { className: "", style: {} };
  }
  return resolveStyleRules(column.styles);
}

export function metricWidgetGridPlacementStyle(
  widget: ViewMetricWidget,
  index: number,
  columnCount: number,
): CSSProperties {
  const placement = resolveWidgetPlacement(widget, index, columnCount);
  const column = placement.column;
  const row = placement.row ?? 1;
  const columnSpan = placement.columnSpan ?? 1;
  const rowSpan = placement.rowSpan ?? 1;

  return {
    gridColumn: `${column} / span ${columnSpan}`,
    gridRow: `${row} / span ${rowSpan}`,
  };
}

export function metricWidgetPlacementForEditor(
  widget: ViewMetricWidget,
  index: number,
  columnCount: number,
): MetricWidgetPlacement {
  const resolved = resolveWidgetPlacement(widget, index, columnCount);
  return {
    column: resolved.column,
    row: resolved.row,
    columnSpan: resolved.columnSpan,
    rowSpan: resolved.rowSpan,
    stackDirection: resolved.stackDirection,
  };
}
