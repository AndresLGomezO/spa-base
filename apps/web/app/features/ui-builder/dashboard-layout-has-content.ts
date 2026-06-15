import type {
  ColumnNode,
  RowNode,
  UiLayoutDocument,
} from "@repo/ui-builder-core";
import { isContainerComponent } from "@repo/ui-builder-core";

function columnHasContent(column: ColumnNode): boolean {
  return column.rows.some((row) => rowHasContent(row));
}

function rowHasContent(row: RowNode): boolean {
  if (row.type === "component") {
    if (isContainerComponent(row.component)) {
      return row.component.rows.some((child) => rowHasContent(child));
    }

    return true;
  }

  return row.columns.some((column) => columnHasContent(column));
}

export function dashboardLayoutHasContent(layout: UiLayoutDocument): boolean {
  return layout.root.columns.some((column) => columnHasContent(column));
}
