import { createLayoutId } from "../builder/id.js";
import type {
  ColumnNode,
  ComponentRowNode,
  NestedLayoutRowNode,
  RowNode,
  UiLayoutDocument,
} from "../types/layout.js";
import { isRowHolderComponent } from "../types/component.js";

function regenerateRowIds(row: RowNode): RowNode {
  if (row.type === "component") {
    if (isRowHolderComponent(row.component)) {
      return {
        ...row,
        id: createLayoutId("row"),
        component: {
          ...row.component,
          rows: row.component.rows.map((child) => regenerateRowIds(child)),
        },
      };
    }

    return { ...row, id: createLayoutId("row") };
  }

  const columns = row.columns.map((column) => regenerateColumnIds(column));
  return {
    ...row,
    id: createLayoutId("nested"),
    columnCount: columns.length,
    columns,
  };
}

function regenerateColumnIds(column: ColumnNode): ColumnNode {
  return {
    ...column,
    id: createLayoutId("col"),
    rows: column.rows.map((row) => regenerateRowIds(row)),
  };
}

export function regenerateComponentRowSubtree(
  row: ComponentRowNode,
): ComponentRowNode {
  if (isRowHolderComponent(row.component)) {
    return {
      ...row,
      id: createLayoutId("row"),
      component: {
        ...row.component,
        rows: row.component.rows.map((child) => regenerateRowIds(child)),
      },
    };
  }

  return { ...row, id: createLayoutId("row") };
}

export function regenerateColumnSubtree(column: ColumnNode): ColumnNode {
  return regenerateColumnIds(column);
}

export function regenerateNestedLayoutRowSubtree(
  row: NestedLayoutRowNode,
): NestedLayoutRowNode {
  const columns = row.columns.map((column) => regenerateColumnIds(column));
  return {
    ...row,
    id: createLayoutId("nested"),
    columnCount: columns.length,
    columns,
  };
}

export function regenerateLayoutDocumentIds(
  layout: UiLayoutDocument,
): UiLayoutDocument {
  const columns = layout.root.columns.map((column) =>
    regenerateColumnIds(column),
  );
  return {
    ...layout,
    root: {
      ...layout.root,
      id: createLayoutId("root"),
      columnCount: columns.length,
      columns,
    },
  };
}
