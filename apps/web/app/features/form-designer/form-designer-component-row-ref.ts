import type { RowLocator } from "@repo/ui-builder-core";

export interface ComponentRowRef {
  readonly rowId: string;
  readonly locator: RowLocator;
}

export function toComponentRowRef(
  rowId: string,
  locator: RowLocator,
): ComponentRowRef {
  return { rowId, locator };
}

export function areComponentRowRefsEqual(
  left: ComponentRowRef | null | undefined,
  right: ComponentRowRef | null | undefined,
): boolean {
  if (left == null || right == null) {
    return left === right;
  }

  return (
    left.rowId === right.rowId &&
    JSON.stringify(left.locator) === JSON.stringify(right.locator)
  );
}
