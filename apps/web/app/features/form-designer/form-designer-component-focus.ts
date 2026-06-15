import {
  isNestedComponentColumnRef,
  type ComponentColumnRef,
} from "./form-designer-component-column-ref";
import {
  areComponentRowRefsEqual,
  type ComponentRowRef,
} from "./form-designer-component-row-ref";

export function columnBelongsToRow(
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

export function rowContainsRowFocus(
  focusedRow: ComponentRowRef | null,
  containerRowRef: ComponentRowRef,
): boolean {
  if (focusedRow == null) {
    return false;
  }

  if (areComponentRowRefsEqual(focusedRow, containerRowRef)) {
    return true;
  }

  if (
    focusedRow.locator.scope === "container" &&
    focusedRow.locator.containerRowId === containerRowRef.rowId
  ) {
    return true;
  }

  return (
    focusedRow.locator.scope === "nested" &&
    focusedRow.locator.rowId === containerRowRef.rowId
  );
}

export function rowContainsFocus(
  focusedRow: ComponentRowRef | null,
  focusedColumn: ComponentColumnRef | null,
  containerRowRef: ComponentRowRef,
): boolean {
  return (
    rowContainsRowFocus(focusedRow, containerRowRef) ||
    (focusedColumn != null &&
      columnBelongsToRow(focusedColumn, containerRowRef))
  );
}

export function rowBelongsToColumn(
  columnRef: ComponentColumnRef,
  rowRef: ComponentRowRef,
): boolean {
  if (isNestedComponentColumnRef(columnRef)) {
    return (
      rowRef.locator.scope === "nested" &&
      rowRef.locator.rowId === columnRef.nestedParentRowId &&
      rowRef.locator.columnIndex === columnRef.rootColumnIndex &&
      rowRef.locator.nestedColumnIndex === columnRef.nestedColumnIndex
    );
  }

  return (
    (rowRef.locator.scope === "root" || rowRef.locator.scope === "container") &&
    rowRef.locator.columnIndex === columnRef.rootColumnIndex
  );
}

export function rowIsWithinFocusedColumn(
  focusedColumn: ComponentColumnRef | null,
  rowRef: ComponentRowRef,
): boolean {
  return focusedColumn != null && rowBelongsToColumn(focusedColumn, rowRef);
}

export function rowFocusBelongsToColumn(
  focusedRow: ComponentRowRef | null,
  columnRef: ComponentColumnRef,
): boolean {
  if (focusedRow == null) {
    return false;
  }

  return rowBelongsToColumn(columnRef, focusedRow);
}

export function rootColumnContainsColumnFocus(
  rootColumnRef: ComponentColumnRef,
  focusedColumn: ComponentColumnRef | null,
): boolean {
  return (
    focusedColumn != null &&
    !isNestedComponentColumnRef(rootColumnRef) &&
    focusedColumn.rootColumnIndex === rootColumnRef.rootColumnIndex
  );
}
