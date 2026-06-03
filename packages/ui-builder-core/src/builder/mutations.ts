import type {
  ColumnNode,
  ComponentRowNode,
  NestedLayoutRowNode,
  RowNode,
  UiLayoutDocument,
} from "../types/layout.js";
import type { UiComponentConfig, UiComponentKind } from "../types/component.js";
import type { StyleRule } from "../styles/style-types.js";
import { createLayoutId } from "./id.js";

export const MAX_ROOT_COLUMNS = 6;
export const MAX_NESTED_COLUMNS = 6;

export function createDefaultComponent(
  kind: UiComponentKind,
  fieldPath: string,
): UiComponentConfig {
  if (kind === "metric-kpi") {
    return {
      kind: "metric-kpi",
      metricDefinitionId: "",
      groupBindings: {},
      dimensionBindings: {},
    };
  }

  if (kind === "form-field") {
    return { kind: "form-field", fieldPath };
  }

  if (kind === "form-section") {
    return { kind: "form-section", title: "Section" };
  }

  if (kind === "form-actions") {
    return { kind: "form-actions" };
  }

  if (kind === "related-records") {
    return {
      kind: "related-records",
      childEntity: "",
      foreignKeyField: "",
    };
  }

  if (
    kind === "page-header" ||
    kind === "page-toolbar" ||
    kind === "page-metrics" ||
    kind === "page-list"
  ) {
    return { kind };
  }

  return {
    kind,
    primary: { type: "field", path: fieldPath },
  } as UiComponentConfig;
}

export function createEmptyColumn(): ColumnNode {
  return { id: createLayoutId("col"), rows: [] };
}

export function createEmptyLayout(columnCount = 1): UiLayoutDocument {
  const count = Math.min(Math.max(1, columnCount), MAX_ROOT_COLUMNS);
  return {
    root: {
      type: "root",
      id: createLayoutId("root"),
      columnCount: count,
      columns: Array.from({ length: count }, () => createEmptyColumn()),
    },
    showActions: true,
    cardsPerRow: 1,
  };
}

export function setRootColumnCount(
  layout: UiLayoutDocument,
  columnCount: number,
): UiLayoutDocument {
  const count = Math.min(Math.max(1, columnCount), MAX_ROOT_COLUMNS);
  const columns = [...layout.root.columns];

  while (columns.length < count) {
    columns.push(createEmptyColumn());
  }

  return {
    ...layout,
    root: {
      ...layout.root,
      columnCount: count,
      columns: columns.slice(0, count),
    },
  };
}

export function moveRootColumn(
  layout: UiLayoutDocument,
  columnIndex: number,
  direction: -1 | 1,
): UiLayoutDocument {
  const target = columnIndex + direction;
  const columns = [...layout.root.columns];
  if (target < 0 || target >= columns.length) {
    return layout;
  }

  const current = columns[columnIndex];
  const swap = columns[target];
  if (!current || !swap) {
    return layout;
  }

  columns[columnIndex] = swap;
  columns[target] = current;

  return {
    ...layout,
    root: { ...layout.root, columns },
  };
}

export function removeRootColumn(
  layout: UiLayoutDocument,
  columnIndex: number,
): UiLayoutDocument {
  if (layout.root.columns.length <= 1) {
    return layout;
  }

  const columns = layout.root.columns.filter(
    (_, index) => index !== columnIndex,
  );
  return {
    ...layout,
    root: {
      ...layout.root,
      columnCount: columns.length,
      columns,
    },
  };
}

function updateColumnRows(
  layout: UiLayoutDocument,
  columnIndex: number,
  updater: (rows: readonly RowNode[]) => readonly RowNode[],
): UiLayoutDocument {
  const columns = layout.root.columns.map((column, index) =>
    index === columnIndex ? { ...column, rows: updater(column.rows) } : column,
  );
  return { ...layout, root: { ...layout.root, columns } };
}

export function addComponentRow(
  layout: UiLayoutDocument,
  columnIndex: number,
  component: UiComponentConfig,
): UiLayoutDocument {
  const row: ComponentRowNode = {
    type: "component",
    id: createLayoutId("row"),
    component,
  };
  return updateColumnRows(layout, columnIndex, (rows) => [...rows, row]);
}

function mapNestedRowById(
  rows: readonly RowNode[],
  rowId: string,
  updater: (row: NestedLayoutRowNode) => NestedLayoutRowNode,
): readonly RowNode[] {
  return rows.map((row) => {
    if (row.type === "nested-layout" && row.id === rowId) {
      return updater(row);
    }

    if (row.type === "nested-layout") {
      return {
        ...row,
        columns: row.columns.map((column) => ({
          ...column,
          rows: mapNestedRowById(column.rows, rowId, updater),
        })),
      };
    }

    return row;
  });
}

/** Updates rows inside a nested column, searching nested-layout rows at any depth. */
function mapNestedColumnRowsById(
  rows: readonly RowNode[],
  rowId: string,
  nestedColumnIndex: number,
  updater: (rows: readonly RowNode[]) => readonly RowNode[],
): readonly RowNode[] {
  return rows.map((row) => {
    if (row.type === "nested-layout" && row.id === rowId) {
      return {
        ...row,
        columns: row.columns.map((column, index) =>
          index === nestedColumnIndex
            ? { ...column, rows: updater(column.rows) }
            : column,
        ),
      };
    }

    if (row.type === "nested-layout") {
      return {
        ...row,
        columns: row.columns.map((column) => ({
          ...column,
          rows: mapNestedColumnRowsById(
            column.rows,
            rowId,
            nestedColumnIndex,
            updater,
          ),
        })),
      };
    }

    return row;
  });
}

function updateNestedRowAt(
  layout: UiLayoutDocument,
  columnIndex: number,
  rowId: string,
  updater: (row: NestedLayoutRowNode) => NestedLayoutRowNode,
): UiLayoutDocument {
  return updateColumnRows(layout, columnIndex, (rows) =>
    mapNestedRowById(rows, rowId, updater),
  );
}

export function setNestedColumnCount(
  layout: UiLayoutDocument,
  columnIndex: number,
  rowId: string,
  columnCount: number,
): UiLayoutDocument {
  const count = Math.min(Math.max(1, columnCount), MAX_NESTED_COLUMNS);

  return updateNestedRowAt(layout, columnIndex, rowId, (row) => {
    const columns = [...row.columns];

    while (columns.length < count) {
      columns.push(createEmptyColumn());
    }

    return {
      ...row,
      columnCount: count,
      columns: columns.slice(0, count),
    };
  });
}

export function moveNestedColumn(
  layout: UiLayoutDocument,
  columnIndex: number,
  rowId: string,
  nestedColumnIndex: number,
  direction: -1 | 1,
): UiLayoutDocument {
  const target = nestedColumnIndex + direction;

  return updateNestedRowAt(layout, columnIndex, rowId, (row) => {
    const columns = [...row.columns];
    if (target < 0 || target >= columns.length) {
      return row;
    }

    const current = columns[nestedColumnIndex];
    const swap = columns[target];
    if (!current || !swap) {
      return row;
    }

    columns[nestedColumnIndex] = swap;
    columns[target] = current;

    return { ...row, columns };
  });
}

export function removeNestedColumn(
  layout: UiLayoutDocument,
  columnIndex: number,
  rowId: string,
  nestedColumnIndex: number,
): UiLayoutDocument {
  return updateNestedRowAt(layout, columnIndex, rowId, (row) => {
    if (row.columns.length <= 1) {
      return row;
    }

    const columns = row.columns.filter(
      (_, index) => index !== nestedColumnIndex,
    );
    return {
      ...row,
      columnCount: columns.length,
      columns,
    };
  });
}

export function updateRootColumnStyles(
  layout: UiLayoutDocument,
  columnIndex: number,
  styles: readonly StyleRule[],
): UiLayoutDocument {
  const columns = layout.root.columns.map((column, index) =>
    index === columnIndex ? { ...column, styles: [...styles] } : column,
  );

  return {
    ...layout,
    root: { ...layout.root, columns },
  };
}

export function updateNestedColumnStyles(
  layout: UiLayoutDocument,
  columnIndex: number,
  rowId: string,
  nestedColumnIndex: number,
  styles: readonly StyleRule[],
): UiLayoutDocument {
  return updateNestedRowAt(layout, columnIndex, rowId, (row) => ({
    ...row,
    columns: row.columns.map((column, index) =>
      index === nestedColumnIndex ? { ...column, styles: [...styles] } : column,
    ),
  }));
}

export function updateRootColumnStackDirection(
  layout: UiLayoutDocument,
  columnIndex: number,
  stackDirection: ColumnNode["stackDirection"],
): UiLayoutDocument {
  const columns = layout.root.columns.map((column, index) =>
    index === columnIndex ? { ...column, stackDirection } : column,
  );

  return {
    ...layout,
    root: { ...layout.root, columns },
  };
}

export function updateNestedColumnStackDirection(
  layout: UiLayoutDocument,
  columnIndex: number,
  rowId: string,
  nestedColumnIndex: number,
  stackDirection: ColumnNode["stackDirection"],
): UiLayoutDocument {
  return updateNestedRowAt(layout, columnIndex, rowId, (row) => ({
    ...row,
    columns: row.columns.map((column, index) =>
      index === nestedColumnIndex ? { ...column, stackDirection } : column,
    ),
  }));
}

export function addNestedLayoutRow(
  layout: UiLayoutDocument,
  columnIndex: number,
  nestedColumnCount = 1,
): UiLayoutDocument {
  const count = Math.min(Math.max(1, nestedColumnCount), MAX_NESTED_COLUMNS);
  const row: NestedLayoutRowNode = {
    type: "nested-layout",
    id: createLayoutId("nested"),
    columnCount: count,
    columns: Array.from({ length: count }, () => createEmptyColumn()),
  };
  return updateColumnRows(layout, columnIndex, (rows) => [...rows, row]);
}

export function updateComponentRow(
  layout: UiLayoutDocument,
  columnIndex: number,
  rowId: string,
  component: UiComponentConfig,
): UiLayoutDocument {
  return updateColumnRows(layout, columnIndex, (rows) =>
    rows.map((row) =>
      row.type === "component" && row.id === rowId
        ? { ...row, component }
        : row,
    ),
  );
}

export function removeRow(
  layout: UiLayoutDocument,
  columnIndex: number,
  rowId: string,
): UiLayoutDocument {
  return updateColumnRows(layout, columnIndex, (rows) =>
    rows.filter((row) => row.id !== rowId),
  );
}

export function moveRow(
  layout: UiLayoutDocument,
  columnIndex: number,
  rowId: string,
  direction: -1 | 1,
): UiLayoutDocument {
  return updateColumnRows(layout, columnIndex, (rows) => {
    const index = rows.findIndex((row) => row.id === rowId);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= rows.length) {
      return rows;
    }
    const next = [...rows];
    const current = next[index];
    const swap = next[target];
    if (!current || !swap) {
      return rows;
    }
    next[index] = swap;
    next[target] = current;
    return next;
  });
}

export function updateLayoutMeta(
  layout: UiLayoutDocument,
  patch: Partial<
    Pick<UiLayoutDocument, "showActions" | "cardsPerRow" | "motion">
  >,
): UiLayoutDocument {
  return { ...layout, ...patch };
}

export function normalizeLayout(layout: UiLayoutDocument): UiLayoutDocument {
  return {
    ...layout,
    root: {
      ...layout.root,
      columnCount: layout.root.columns.length,
    },
  };
}

type RowLocator =
  | { readonly scope: "root"; readonly columnIndex: number }
  | {
      readonly scope: "nested";
      readonly columnIndex: number;
      readonly rowId: string;
      readonly nestedColumnIndex: number;
    };

function mapRootColumns(
  layout: UiLayoutDocument,
  mapper: (columns: readonly ColumnNode[]) => readonly ColumnNode[],
): UiLayoutDocument {
  return {
    ...layout,
    root: { ...layout.root, columns: mapper(layout.root.columns) },
  };
}

function updateRowsAtLocator(
  layout: UiLayoutDocument,
  locator: RowLocator,
  updater: (rows: readonly RowNode[]) => readonly RowNode[],
): UiLayoutDocument {
  if (locator.scope === "root") {
    return updateColumnRows(layout, locator.columnIndex, updater);
  }

  return mapRootColumns(layout, (columns) =>
    columns.map((column, columnIndex) => {
      if (columnIndex !== locator.columnIndex) {
        return column;
      }

      return {
        ...column,
        rows: mapNestedColumnRowsById(
          column.rows,
          locator.rowId,
          locator.nestedColumnIndex,
          updater,
        ),
      };
    }),
  );
}

export function addComponentRowAt(
  layout: UiLayoutDocument,
  locator: RowLocator,
  component: UiComponentConfig,
): UiLayoutDocument {
  const row: ComponentRowNode = {
    type: "component",
    id: createLayoutId("row"),
    component,
  };
  return updateRowsAtLocator(layout, locator, (rows) => [...rows, row]);
}

export function addNestedLayoutRowAt(
  layout: UiLayoutDocument,
  locator: RowLocator,
  nestedColumnCount = 1,
): UiLayoutDocument {
  const count = Math.min(Math.max(1, nestedColumnCount), MAX_NESTED_COLUMNS);
  const row: NestedLayoutRowNode = {
    type: "nested-layout",
    id: createLayoutId("nested"),
    columnCount: count,
    columns: Array.from({ length: count }, () => createEmptyColumn()),
  };
  return updateRowsAtLocator(layout, locator, (rows) => [...rows, row]);
}

export function removeRowAt(
  layout: UiLayoutDocument,
  locator: RowLocator,
  rowId: string,
): UiLayoutDocument {
  return updateRowsAtLocator(layout, locator, (rows) =>
    rows.filter((row) => row.id !== rowId),
  );
}

export function moveRowAt(
  layout: UiLayoutDocument,
  locator: RowLocator,
  rowId: string,
  direction: -1 | 1,
): UiLayoutDocument {
  return updateRowsAtLocator(layout, locator, (rows) => {
    const index = rows.findIndex((row) => row.id === rowId);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= rows.length) {
      return rows;
    }
    const next = [...rows];
    const current = next[index];
    const swap = next[target];
    if (!current || !swap) {
      return rows;
    }
    next[index] = swap;
    next[target] = current;
    return next;
  });
}

export function updateComponentRowAt(
  layout: UiLayoutDocument,
  locator: RowLocator,
  rowId: string,
  component: UiComponentConfig,
): UiLayoutDocument {
  return updateRowsAtLocator(layout, locator, (rows) =>
    rows.map((row) =>
      row.type === "component" && row.id === rowId
        ? { ...row, component }
        : row,
    ),
  );
}

export type { RowLocator };
