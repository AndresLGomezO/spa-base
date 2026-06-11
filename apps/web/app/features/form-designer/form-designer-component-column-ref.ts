import type { StructureColumnNode } from "./form-designer-structure-tree";

export interface ComponentColumnRef {
  readonly rootColumnIndex: number;
  readonly nestedParentRowId?: string;
  readonly nestedColumnIndex?: number;
}

export function toComponentColumnRef(
  column: StructureColumnNode,
): ComponentColumnRef {
  if (column.parentRowId != null && column.nestedColumnIndex != null) {
    return {
      rootColumnIndex: column.columnIndex,
      nestedParentRowId: column.parentRowId,
      nestedColumnIndex: column.nestedColumnIndex,
    };
  }

  return { rootColumnIndex: column.columnIndex };
}

export function isNestedComponentColumnRef(
  columnRef: ComponentColumnRef,
): columnRef is ComponentColumnRef & {
  readonly nestedParentRowId: string;
  readonly nestedColumnIndex: number;
} {
  return (
    columnRef.nestedParentRowId != null && columnRef.nestedColumnIndex != null
  );
}

export function componentColumnRefKey(columnRef: ComponentColumnRef): string {
  if (
    columnRef.nestedParentRowId != null &&
    columnRef.nestedColumnIndex != null
  ) {
    return `${columnRef.rootColumnIndex}:${columnRef.nestedParentRowId}:${columnRef.nestedColumnIndex}`;
  }

  return `${columnRef.rootColumnIndex}`;
}

export function areComponentColumnRefsEqual(
  left: ComponentColumnRef | null | undefined,
  right: ComponentColumnRef | null | undefined,
): boolean {
  if (left == null || right == null) {
    return left === right;
  }

  return componentColumnRefKey(left) === componentColumnRefKey(right);
}
