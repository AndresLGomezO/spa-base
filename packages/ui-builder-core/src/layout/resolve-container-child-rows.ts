import { isContainerComponent } from "../types/component.js";
import type { RowNode } from "../types/layout.js";

export function resolveContainerChildRows(
  rows: readonly RowNode[],
  containerRowId: string,
): readonly RowNode[] | undefined {
  for (const row of rows) {
    if (
      row.type === "component" &&
      row.id === containerRowId &&
      isContainerComponent(row.component)
    ) {
      return row.component.rows;
    }

    if (row.type === "component" && isContainerComponent(row.component)) {
      const nested = resolveContainerChildRows(
        row.component.rows,
        containerRowId,
      );
      if (nested) {
        return nested;
      }
    }

    if (row.type === "nested-layout") {
      for (const column of row.columns) {
        const nested = resolveContainerChildRows(column.rows, containerRowId);
        if (nested) {
          return nested;
        }
      }
    }
  }

  return undefined;
}
