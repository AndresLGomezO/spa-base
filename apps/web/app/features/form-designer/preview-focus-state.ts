import type {
  RowLocator,
  RowNode,
  UiLayoutDocument,
} from "@repo/ui-builder-core";
import {
  isGridComponent,
  isRowHolderComponent,
  resolveLayoutRootColumns,
} from "@repo/ui-builder-core";

import {
  areComponentColumnRefsEqual,
  isNestedComponentColumnRef,
  type ComponentColumnRef,
} from "./form-designer-component-column-ref";
import { findColumnByRef } from "./form-designer-components-layout";
import {
  areComponentRowRefsEqual,
  toComponentRowRef,
  type ComponentRowRef,
} from "./form-designer-component-row-ref";

export type PreviewFocusState = "focused" | "dimmed" | "none";

type LocatorContext = {
  readonly columnIndex: number;
  readonly containerRowId?: string;
};

function buildLocator(context: LocatorContext): RowLocator {
  if (context.containerRowId != null) {
    return {
      scope: "container",
      columnIndex: context.columnIndex,
      containerRowId: context.containerRowId,
    };
  }

  return { scope: "root", columnIndex: context.columnIndex };
}

function findRowRefInRows(
  rows: readonly RowNode[],
  context: LocatorContext,
  targetRowId: string,
): ComponentRowRef | null {
  for (const row of rows) {
    if (row.id === targetRowId) {
      return toComponentRowRef(row.id, buildLocator(context));
    }

    if (row.type === "component" && isRowHolderComponent(row.component)) {
      if (isGridComponent(row.component)) {
        for (const trackRow of row.component.rows) {
          if (trackRow.type !== "component") {
            continue;
          }

          if (trackRow.id === targetRowId) {
            return toComponentRowRef(trackRow.id, {
              scope: "container",
              columnIndex: context.columnIndex,
              containerRowId: row.id,
            });
          }

          if (isRowHolderComponent(trackRow.component)) {
            const found = findRowRefInRows(
              trackRow.component.rows,
              {
                columnIndex: context.columnIndex,
                containerRowId: trackRow.id,
              },
              targetRowId,
            );
            if (found) {
              return found;
            }
          }
        }
        continue;
      }

      const found = findRowRefInRows(
        row.component.rows,
        { columnIndex: context.columnIndex, containerRowId: row.id },
        targetRowId,
      );
      if (found) {
        return found;
      }
    }
  }

  return null;
}

export function findRowRefById(
  layout: UiLayoutDocument,
  rowId: string,
): ComponentRowRef | null {
  for (
    let columnIndex = 0;
    columnIndex < resolveLayoutRootColumns(layout).length;
    columnIndex++
  ) {
    const column = resolveLayoutRootColumns(layout)[columnIndex];
    if (!column) {
      continue;
    }

    const found = findRowRefInRows(column.rows, { columnIndex }, rowId);
    if (found) {
      return found;
    }
  }

  return null;
}

export function getParentRowRef(
  layout: UiLayoutDocument,
  rowRef: ComponentRowRef,
): ComponentRowRef | null {
  const { locator } = rowRef;

  if (locator.scope === "root") {
    return null;
  }

  return findRowRefById(layout, locator.containerRowId);
}

export function isRowAncestorOf(
  layout: UiLayoutDocument,
  ancestorRef: ComponentRowRef,
  descendantRef: ComponentRowRef,
): boolean {
  if (areComponentRowRefsEqual(ancestorRef, descendantRef)) {
    return true;
  }

  if (ancestorRef.rowId === descendantRef.rowId) {
    return true;
  }

  let current: ComponentRowRef | null = descendantRef;
  while (current) {
    const parent = getParentRowRef(layout, current);
    if (!parent) {
      return false;
    }

    if (areComponentRowRefsEqual(parent, ancestorRef)) {
      return true;
    }

    current = parent;
  }

  return false;
}

function resolveGridTrackRowId(
  layout: UiLayoutDocument,
  columnRef: ComponentColumnRef,
): string | undefined {
  if (!isNestedComponentColumnRef(columnRef)) {
    return undefined;
  }

  const resolved = findColumnByRef(layout, columnRef);
  const parentGridRow = resolved?.parentGridRow;
  if (
    !parentGridRow ||
    parentGridRow.type !== "component" ||
    !isGridComponent(parentGridRow.component)
  ) {
    return undefined;
  }

  const trackRow = parentGridRow.component.rows[columnRef.nestedColumnIndex];
  return trackRow?.type === "component" ? trackRow.id : undefined;
}

function columnBelongsToRow(
  layout: UiLayoutDocument,
  columnRef: ComponentColumnRef,
  rowRef: ComponentRowRef,
): boolean {
  if (!isNestedComponentColumnRef(columnRef)) {
    return false;
  }

  const trackRowId = resolveGridTrackRowId(layout, columnRef);
  if (!trackRowId) {
    return false;
  }

  return (
    rowRef.rowId === columnRef.nestedParentRowId ||
    rowRef.rowId === trackRowId ||
    isRowAncestorOf(
      layout,
      toComponentRowRef(trackRowId, {
        scope: "container",
        columnIndex: columnRef.rootColumnIndex,
        containerRowId: columnRef.nestedParentRowId,
      }),
      rowRef,
    )
  );
}

function rowIsInGridTrackColumn(
  layout: UiLayoutDocument,
  columnRef: ComponentColumnRef,
  rowRef: ComponentRowRef,
): boolean {
  const trackRowId = resolveGridTrackRowId(layout, columnRef);
  if (!trackRowId) {
    return false;
  }

  let current: ComponentRowRef | null = rowRef;
  while (current) {
    if (current.rowId === trackRowId) {
      return true;
    }

    if (current.rowId === columnRef.nestedParentRowId) {
      return false;
    }

    current = getParentRowRef(layout, current);
  }

  return false;
}

function rowBelongsToColumn(
  layout: UiLayoutDocument,
  columnRef: ComponentColumnRef,
  rowRef: ComponentRowRef,
): boolean {
  if (isNestedComponentColumnRef(columnRef)) {
    if (
      rowRef.locator.scope === "container" &&
      rowRef.locator.containerRowId === columnRef.nestedParentRowId &&
      rowRef.rowId === resolveGridTrackRowId(layout, columnRef)
    ) {
      return true;
    }

    return rowIsInGridTrackColumn(layout, columnRef, rowRef);
  }

  return (
    (rowRef.locator.scope === "root" || rowRef.locator.scope === "container") &&
    rowRef.locator.columnIndex === columnRef.rootColumnIndex
  );
}

function rowContainsFocus(
  layout: UiLayoutDocument,
  focusedRow: ComponentRowRef | null,
  focusedColumn: ComponentColumnRef | null,
  rowRef: ComponentRowRef,
): boolean {
  if (focusedRow != null) {
    if (
      isRowAncestorOf(layout, rowRef, focusedRow) ||
      isRowAncestorOf(layout, focusedRow, rowRef)
    ) {
      return true;
    }
  }

  return (
    focusedColumn != null && columnBelongsToRow(layout, focusedColumn, rowRef)
  );
}

function columnClaimsRowInterior(
  layout: UiLayoutDocument,
  focusedColumn: ComponentColumnRef | null,
  focusedRow: ComponentRowRef | null,
  rowRef: ComponentRowRef,
): boolean {
  return (
    focusedColumn != null &&
    focusedRow == null &&
    rowBelongsToColumn(layout, focusedColumn, rowRef)
  );
}

export function resolvePreviewRowFocusState(
  layout: UiLayoutDocument,
  rowRef: ComponentRowRef,
  focusedRow: ComponentRowRef | null,
  focusedColumn: ComponentColumnRef | null,
): PreviewFocusState {
  const hasActiveFocus = focusedRow != null || focusedColumn != null;
  if (!hasActiveFocus) {
    return "none";
  }

  const containsFocus = rowContainsFocus(
    layout,
    focusedRow,
    focusedColumn,
    rowRef,
  );
  const columnClaimsInterior = columnClaimsRowInterior(
    layout,
    focusedColumn,
    focusedRow,
    rowRef,
  );
  const hasColumnFocusInsideRow =
    focusedColumn != null && columnBelongsToRow(layout, focusedColumn, rowRef);
  const isFocused =
    focusedRow != null &&
    focusedRow.rowId === rowRef.rowId &&
    !hasColumnFocusInsideRow;
  const showRowFocus = isFocused && !columnClaimsInterior;

  if (showRowFocus) {
    return "focused";
  }

  if (
    focusedRow != null &&
    focusedRow.rowId !== rowRef.rowId &&
    isRowAncestorOf(layout, rowRef, focusedRow)
  ) {
    return "none";
  }

  if (hasActiveFocus && !containsFocus && !columnClaimsInterior) {
    return "dimmed";
  }

  return "none";
}

function rowFocusBelongsToColumn(
  layout: UiLayoutDocument,
  focusedRow: ComponentRowRef | null,
  columnRef: ComponentColumnRef,
): boolean {
  if (focusedRow == null) {
    return false;
  }

  return rowBelongsToColumn(layout, columnRef, focusedRow);
}

function rootColumnContainsColumnFocus(
  rootColumnRef: ComponentColumnRef,
  focusedColumn: ComponentColumnRef | null,
): boolean {
  return (
    focusedColumn != null &&
    !isNestedComponentColumnRef(rootColumnRef) &&
    focusedColumn.rootColumnIndex === rootColumnRef.rootColumnIndex
  );
}

export function resolvePreviewColumnFocusState(
  layout: UiLayoutDocument,
  columnRef: ComponentColumnRef,
  focusedRow: ComponentRowRef | null,
  focusedColumn: ComponentColumnRef | null,
): PreviewFocusState {
  const hasPeerColumnFocus = focusedColumn != null;
  const isColumnFocused =
    focusedColumn != null &&
    areComponentColumnRefsEqual(focusedColumn, columnRef);
  const hasRowFocusInsideColumn = rowFocusBelongsToColumn(
    layout,
    focusedRow,
    columnRef,
  );
  const containsDescendantColumnFocus =
    !isNestedComponentColumnRef(columnRef) &&
    rootColumnContainsColumnFocus(columnRef, focusedColumn);

  if (isColumnFocused && focusedRow == null) {
    return "focused";
  }

  if (
    hasPeerColumnFocus &&
    !hasRowFocusInsideColumn &&
    !isColumnFocused &&
    !containsDescendantColumnFocus
  ) {
    return "dimmed";
  }

  return "none";
}
