import type {
  RowLocator,
  RowNode,
  UiLayoutDocument,
} from "@repo/ui-builder-core";
import { isContainerComponent } from "@repo/ui-builder-core";

import {
  areComponentColumnRefsEqual,
  isNestedComponentColumnRef,
  type ComponentColumnRef,
} from "./form-designer-component-column-ref";
import {
  areComponentRowRefsEqual,
  toComponentRowRef,
  type ComponentRowRef,
} from "./form-designer-component-row-ref";

export type PreviewFocusState = "focused" | "dimmed" | "none";

type LocatorContext = {
  readonly columnIndex: number;
  readonly containerRowId?: string;
  readonly parentRowId?: string;
  readonly nestedColumnIndex?: number;
};

function buildLocator(context: LocatorContext): RowLocator {
  if (context.parentRowId != null && context.nestedColumnIndex != null) {
    return {
      scope: "nested",
      columnIndex: context.columnIndex,
      rowId: context.parentRowId,
      nestedColumnIndex: context.nestedColumnIndex,
      containerRowId: context.containerRowId,
    };
  }

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

    if (row.type === "component" && isContainerComponent(row.component)) {
      const found = findRowRefInRows(
        row.component.rows,
        { columnIndex: context.columnIndex, containerRowId: row.id },
        targetRowId,
      );
      if (found) {
        return found;
      }
    }

    if (row.type === "nested-layout") {
      for (
        let nestedColumnIndex = 0;
        nestedColumnIndex < row.columns.length;
        nestedColumnIndex++
      ) {
        const column = row.columns[nestedColumnIndex];
        if (!column) {
          continue;
        }

        const found = findRowRefInRows(
          column.rows,
          {
            columnIndex: context.columnIndex,
            containerRowId: context.containerRowId,
            parentRowId: row.id,
            nestedColumnIndex,
          },
          targetRowId,
        );
        if (found) {
          return found;
        }
      }
    }
  }

  return null;
}

function findRowRefById(
  layout: UiLayoutDocument,
  rowId: string,
): ComponentRowRef | null {
  for (
    let columnIndex = 0;
    columnIndex < layout.root.columns.length;
    columnIndex++
  ) {
    const column = layout.root.columns[columnIndex];
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

  if (locator.scope === "container") {
    return findRowRefById(layout, locator.containerRowId);
  }

  return findRowRefById(layout, locator.rowId);
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

function columnBelongsToRow(
  columnRef: ComponentColumnRef,
  rowRef: ComponentRowRef,
): boolean {
  if (!isNestedComponentColumnRef(columnRef)) {
    return false;
  }

  return (
    columnRef.nestedParentRowId === rowRef.rowId &&
    columnRef.rootColumnIndex === rowRef.locator.columnIndex
  );
}

function rowIsInNestedColumn(
  layout: UiLayoutDocument,
  columnRef: ComponentColumnRef,
  rowRef: ComponentRowRef,
): boolean {
  if (!isNestedComponentColumnRef(columnRef)) {
    return false;
  }

  let current: ComponentRowRef | null = rowRef;
  while (current) {
    const { locator } = current;
    if (
      locator.scope === "nested" &&
      locator.rowId === columnRef.nestedParentRowId &&
      locator.columnIndex === columnRef.rootColumnIndex &&
      locator.nestedColumnIndex === columnRef.nestedColumnIndex
    ) {
      return true;
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
      rowRef.locator.scope === "nested" &&
      rowRef.locator.rowId === columnRef.nestedParentRowId &&
      rowRef.locator.columnIndex === columnRef.rootColumnIndex &&
      rowRef.locator.nestedColumnIndex === columnRef.nestedColumnIndex
    ) {
      return true;
    }

    return rowIsInNestedColumn(layout, columnRef, rowRef);
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
  containerRowRef: ComponentRowRef,
): boolean {
  if (
    focusedRow != null &&
    isRowAncestorOf(layout, containerRowRef, focusedRow)
  ) {
    return true;
  }

  return (
    focusedColumn != null && columnBelongsToRow(focusedColumn, containerRowRef)
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
    focusedColumn != null && columnBelongsToRow(focusedColumn, rowRef);
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

export function resolvePreviewColumnChromeProps(
  columnRef: ComponentColumnRef,
  focusedRow: ComponentRowRef | null,
  focusedColumn: ComponentColumnRef | null,
): {
  readonly isColumnFocused: boolean;
  readonly hasPeerColumnFocus: boolean;
  readonly focusedColumn: ComponentColumnRef | null;
  readonly focusedRow: ComponentRowRef | null;
} {
  return {
    isColumnFocused:
      focusedColumn != null &&
      areComponentColumnRefsEqual(focusedColumn, columnRef),
    hasPeerColumnFocus: focusedColumn != null,
    focusedColumn,
    focusedRow,
  };
}
