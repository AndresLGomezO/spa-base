import type { GroupedTableColumn, UiLayoutDocument } from "@repo/entities";

import {
  formatFieldLabel,
  type EntityCatalogEntry,
} from "../../entities/entity-catalog";

function resolveFirstFieldPathFromCellLayout(
  layout: UiLayoutDocument,
): string | null {
  for (const column of layout.root.columns) {
    for (const row of column.rows) {
      if (
        row.type === "component" &&
        "primary" in row.component &&
        row.component.primary?.type === "field"
      ) {
        return row.component.primary.path;
      }
    }
  }

  return null;
}

export function resolveExpandableTableGroupedColumnDisplayLabel(
  column: GroupedTableColumn,
  columnIndex: number,
  formatIndexedColumnLabel: (oneBasedIndex: number) => string,
): string {
  const explicitLabel = column.label?.trim();
  if (explicitLabel) {
    return explicitLabel;
  }

  return formatIndexedColumnLabel(columnIndex + 1);
}

export function resolveExpandableTableGroupedColumnLabelPlaceholder(
  column: GroupedTableColumn,
  definition: EntityCatalogEntry,
): string {
  const fieldPath = resolveFirstFieldPathFromCellLayout(column.cellLayout);
  if (fieldPath) {
    return formatFieldLabel(fieldPath, definition);
  }

  return formatFieldLabel(column.id, definition);
}
