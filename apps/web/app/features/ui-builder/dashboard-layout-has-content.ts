import type {
  ColumnNode,
  RowNode,
  UiLayoutDocument,
} from "@repo/ui-builder-core";
import {
  isGridComponent,
  isRowHolderComponent,
  resolveLayoutRootColumns,
} from "@repo/ui-builder-core";

function columnHasContent(column: ColumnNode): boolean {
  return column.rows.some((row) => rowHasContent(row));
}

function rowHasContent(row: RowNode): boolean {
  if (row.type === "component") {
    if (isRowHolderComponent(row.component)) {
      if (isGridComponent(row.component)) {
        return row.component.rows.some(
          (track) => track.type === "component" && rowHasContent(track),
        );
      }

      return row.component.rows.some((child) => rowHasContent(child));
    }

    return true;
  }

  return false;
}

export function dashboardLayoutHasContent(layout: UiLayoutDocument): boolean {
  return resolveLayoutRootColumns(layout).some((column) =>
    columnHasContent(column),
  );
}
