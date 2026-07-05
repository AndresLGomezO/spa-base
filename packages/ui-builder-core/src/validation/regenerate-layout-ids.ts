import { createLayoutId } from "../builder/id.js";
import { toEditableLayoutDocument } from "../layout/layout-root-adapters.js";
import type {
  ColumnNode,
  ComponentRowNode,
  LayoutRootNode,
  RowNode,
  UiLayoutDocument,
} from "../types/layout.js";
import { isScreenRootNode } from "../types/layout.js";
import { isRowHolderComponent } from "../types/component.js";

function regenerateRowIds(row: RowNode): RowNode {
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

export function regenerateLayoutDocumentIds(
  layout: UiLayoutDocument,
): UiLayoutDocument {
  const editable = toEditableLayoutDocument(layout);

  if (isScreenRootNode(editable.root)) {
    return {
      ...editable,
      root: {
        ...editable.root,
        id: createLayoutId("screen-root"),
        rows: editable.root.rows.map((row) => regenerateRowIds(row)),
      },
    };
  }

  const root = editable.root as LayoutRootNode;
  const columns = root.columns.map((column) => regenerateColumnIds(column));

  return {
    ...editable,
    root: {
      ...root,
      id: createLayoutId("root"),
      columns,
      columnCount: columns.length,
    },
  };
}
