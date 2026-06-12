import {
  createDefaultTableCellLayout,
  createDefaultRowExpandLayout,
  createLayoutId,
  type UiLayoutDocument,
} from "@repo/ui-builder-core";

import type { ExpandableTableViewConfig, GroupedTableColumn } from "./types.js";

export function createDefaultExpandableTableView(
  fieldPaths: readonly string[],
): ExpandableTableViewConfig {
  const visibleColumnCount = Math.min(3, Math.max(1, fieldPaths.length));
  const columnFields = fieldPaths.slice(0, visibleColumnCount);
  const expandFields = fieldPaths.slice(visibleColumnCount);

  const columns: GroupedTableColumn[] = columnFields.map(
    (fieldPath, index) => ({
      id: `column-${index}`,
      cellLayout: createDefaultTableCellLayout([fieldPath]),
    }),
  );

  if (columns.length === 0) {
    columns.push({
      id: "column-0",
      cellLayout: createDefaultTableCellLayout(
        fieldPaths.slice(0, 1).length > 0 ? fieldPaths.slice(0, 1) : ["name"],
      ),
    });
  }

  return {
    type: "expandableTable",
    name: "expandable",
    fields: [...fieldPaths],
    columns,
    rowExpandLayout: createDefaultRowExpandLayout(
      expandFields.length > 0 ? expandFields : fieldPaths,
    ),
    showActions: true,
  };
}

export function expandableTableViewFromListItem(
  listItem: UiLayoutDocument,
  fieldPaths: readonly string[],
): ExpandableTableViewConfig {
  const columns: GroupedTableColumn[] = listItem.root.columns.map(
    (column, index) => ({
      id: column.id || `column-${index}`,
      cellLayout: {
        root: {
          type: "root",
          id: createLayoutId("root"),
          columnCount: 1,
          columns: [column],
        },
      },
    }),
  );

  return {
    type: "expandableTable",
    name: "expandable",
    fields: [...fieldPaths],
    columns:
      columns.length > 0
        ? columns
        : [
            {
              id: "column-0",
              cellLayout: createDefaultTableCellLayout(
                fieldPaths.slice(0, 1).length > 0
                  ? fieldPaths.slice(0, 1)
                  : ["name"],
              ),
            },
          ],
    rowExpandLayout: listItem,
    showActions: listItem.showActions,
  };
}
