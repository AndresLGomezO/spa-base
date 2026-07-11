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

/** Stable DOM attribute value for runtime column shells (preview overlay). */
export function toLayoutColumnIdAttr(columnRef: ComponentColumnRef): string {
  return componentColumnRefKey(columnRef);
}

export function parseLayoutColumnIdAttr(
  value: string,
): ComponentColumnRef | null {
  if (!value) {
    return null;
  }

  const parts = value.split(":");
  if (parts.length === 1) {
    const rootColumnIndex = Number(parts[0]);
    if (
      !Number.isInteger(rootColumnIndex) ||
      String(rootColumnIndex) !== parts[0]
    ) {
      return null;
    }
    return { rootColumnIndex };
  }

  if (parts.length === 3) {
    const rootColumnIndex = Number(parts[0]);
    const nestedColumnIndex = Number(parts[2]);
    const nestedParentRowId = parts[1];
    if (
      !Number.isInteger(rootColumnIndex) ||
      !Number.isInteger(nestedColumnIndex) ||
      String(rootColumnIndex) !== parts[0] ||
      String(nestedColumnIndex) !== parts[2] ||
      !nestedParentRowId
    ) {
      return null;
    }
    return {
      rootColumnIndex,
      nestedParentRowId,
      nestedColumnIndex,
    };
  }

  return null;
}
