import {
  resolveLayoutRootColumns,
  type UiLayoutDocument,
} from "@repo/ui-builder-core";

import {
  toComponentRowRef,
  type ComponentRowRef,
} from "../../features/form-designer/form-designer-component-row-ref";

export function resolveFirstComponentRowRef(
  layout: UiLayoutDocument,
): ComponentRowRef | null {
  const columns = resolveLayoutRootColumns(layout);

  for (let columnIndex = 0; columnIndex < columns.length; columnIndex += 1) {
    const column = columns[columnIndex];
    const firstRow = column?.rows[0];
    if (firstRow) {
      return toComponentRowRef(firstRow.id, { scope: "root", columnIndex });
    }
  }

  return null;
}
export const DEFAULT_GROUPED_COLUMN_INDEX = 0;
