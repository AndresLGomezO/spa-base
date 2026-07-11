import {
  isContainerComponent,
  isGridComponent,
  isRowHolderComponent,
  resolveLayoutRootColumns,
  type RowNode,
  type UiLayoutDocument,
} from "@repo/ui-builder-core";

function rowsHaveLeafContent(rows: readonly RowNode[]): boolean {
  for (const row of rows) {
    if (isContainerComponent(row.component) || isGridComponent(row.component)) {
      if (rowsHaveLeafContent(row.component.rows)) {
        return true;
      }
      continue;
    }

    if (isRowHolderComponent(row.component)) {
      if (rowsHaveLeafContent(row.component.rows)) {
        return true;
      }
      continue;
    }

    return true;
  }

  return false;
}

/** True when the layout has at least one non-structural leaf component. */
export function appShellLayoutHasContent(layout: UiLayoutDocument): boolean {
  return resolveLayoutRootColumns(layout).some((column) =>
    rowsHaveLeafContent(column.rows),
  );
}
