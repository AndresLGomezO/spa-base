import type { UiComponentConfig, UiComponentKind } from "../types/component.js";
import {
  isRowHolderComponent,
  isSidebarNavComponent,
} from "../types/component.js";
import type { ColumnNode, RowNode, UiLayoutDocument } from "../types/layout.js";
import { resolveLayoutRootColumns } from "./layout-root-adapters.js";

function walkRows(
  rows: readonly RowNode[],
  kind: UiComponentKind,
): UiComponentConfig | undefined {
  for (const row of rows) {
    if (row.component.kind === kind) {
      return row.component;
    }

    if (isSidebarNavComponent(row.component)) {
      for (const template of [
        row.component.groupItem,
        row.component.subgroupItem,
        row.component.rawItem,
      ] as const) {
        const found = walkRows(template.rows, kind);
        if (found) {
          return found;
        }
      }
      continue;
    }

    if (isRowHolderComponent(row.component)) {
      const found = walkRows(row.component.rows, kind);
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
  for (const column of resolveLayoutRootColumns(layout)) {
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
