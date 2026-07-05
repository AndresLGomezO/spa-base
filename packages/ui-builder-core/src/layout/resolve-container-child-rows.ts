import { isRowHolderComponent } from "../types/component.js";
import type { RowNode } from "../types/layout.js";

export function resolveContainerChildRows(
  rows: readonly RowNode[],
  containerRowId: string,
): readonly RowNode[] | undefined {
  return resolveRowHolderChildRows(rows, containerRowId);
}

export function resolveRowHolderChildRows(
  rows: readonly RowNode[],
  holderRowId: string,
): readonly RowNode[] | undefined {
  for (const row of rows) {
    if (
      row.type === "component" &&
      row.id === holderRowId &&
      isRowHolderComponent(row.component)
    ) {
      return row.component.rows;
    }

    if (row.type === "component" && isRowHolderComponent(row.component)) {
      const nested = resolveRowHolderChildRows(row.component.rows, holderRowId);
      if (nested) {
        return nested;
      }
    }
  }

  return undefined;
}
