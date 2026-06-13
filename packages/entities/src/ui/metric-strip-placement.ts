import { createEmptyLayout } from "@repo/ui-builder-core";
import type { UiLayoutDocument } from "@repo/ui-builder-core";

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

/** True when any strip column has at least one row (gates strip visibility). */
export function metricStripHasContent(
  layout: UiLayoutDocument | undefined,
): boolean {
  if (!layout) {
    return false;
  }
  return layout.root.columns.some((column) => column.rows.length > 0);
}
