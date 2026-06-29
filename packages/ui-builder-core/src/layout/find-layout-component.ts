import type { UiComponentConfig, UiComponentKind } from "../types/component.js";
import { isRowHolderComponent } from "../types/component.js";
import type { ColumnNode, RowNode, UiLayoutDocument } from "../types/layout.js";

function walkRows(
  rows: readonly RowNode[],
  kind: UiComponentKind,
): UiComponentConfig | undefined {
  for (const row of rows) {
    if (row.type === "component") {
      if (row.component.kind === kind) {
        return row.component;
      }

      if (isRowHolderComponent(row.component)) {
        const found = walkRows(row.component.rows, kind);
        if (found) {
          return found;
        }
      }

      continue;
    }

    for (const column of row.columns) {
      const found = walkColumn(column, kind);
      if (found) {
        return found;
      }
    }
  }
  return undefined;
}

function walkColumn(
  column: ColumnNode,
  kind: UiComponentKind,
): UiComponentConfig | undefined {
  return walkRows(column.rows, kind);
}

export function findLayoutComponent(
  layout: UiLayoutDocument,
  kind: UiComponentKind,
): UiComponentConfig | undefined {
  for (const column of layout.root.columns) {
    const found = walkColumn(column, kind);
    if (found) {
      return found;
    }
  }
  return undefined;
}

export function layoutHasComponentKind(
  layout: UiLayoutDocument,
  kind: UiComponentKind,
): boolean {
  return findLayoutComponent(layout, kind) != null;
}
