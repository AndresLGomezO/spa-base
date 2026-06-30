import type {
  ColumnNode,
  ComponentRowNode,
  NestedLayoutRowNode,
  RowNode,
  UiLayoutDocument,
} from "../types/layout.js";
import type { UiComponentConfig, UiComponentKind } from "../types/component.js";
import type { ContainerComponentConfig } from "../types/component.js";
import {
  isContainerComponent,
  isRowHolderComponent,
} from "../types/component.js";
import type { StyleRule } from "../styles/style-types.js";
import { isFullDisplayRange } from "../layout/component-display-range.js";
import type { ResponsiveGridBreakpoint } from "../layout/responsive-grid.js";
import { createLayoutId } from "./id.js";
import { regenerateLayoutDocumentIds } from "../validation/regenerate-layout-ids.js";
import {
  regenerateComponentRowSubtree,
  regenerateNestedLayoutRowSubtree,
} from "../validation/regenerate-layout-ids.js";
import { migrateViewSearchFilterLayout } from "../layout/migrate-view-search-filter-layout.js";

export const MAX_ROOT_COLUMNS = 6;
export const MAX_NESTED_COLUMNS = 6;

const DEFAULT_METRIC_DERIVED_EXPRESSION = [
  { type: "metric" as const, metricDefinitionId: "" },
  { type: "operator" as const, op: "-" as const },
  { type: "metric" as const, metricDefinitionId: "" },
];

export function createDefaultComponent(
  kind: UiComponentKind,
  fieldPath = "name",
): UiComponentConfig {
  if (kind === "metric-kpi") {
    return {
      kind: "metric-kpi",
      metricDefinitionId: "",
      groupBindings: {},
      dimensionBindings: {},
    };
  }

  if (kind === "metric-derived-kpi") {
    return {
      kind: "metric-derived-kpi",
      expression: DEFAULT_METRIC_DERIVED_EXPRESSION,
      groupBindings: {},
      dimensionBindings: {},
    };
  }

  if (kind === "metric-widget") {
    return {
      kind: "metric-widget",
      entityName: "",
      widgetId: "",
    };
  }

  if (kind === "query-viewer") {
    return {
      kind: "query-viewer",
      entityQueryDefinitionId: "",
      rows: [],
    };
  }

  if (kind === "dashboard-section") {
    return {
      kind: "dashboard-section",
      sectionId: "",
    };
  }

  if (kind === "view-search" || kind === "view-filter") {
    return {
      kind: "view-filter",
      enableSearch: true,
      enableFilters: true,
      filters: [],
    };
  }

  if (kind === "form-field") {
    return { kind: "form-field", fieldPath };
  }

  if (kind === "entity-field-selector") {
    return {
      kind: "entity-field-selector",
      fieldPath,
      layout: "list",
      enableSearch: true,
    };
  }

  if (kind === "form-section") {
    return { kind: "form-section", title: "Section" };
  }

  if (kind === "icon") {
    return { kind: "icon", iconName: "CircleCheck" };
  }

  if (kind === "user") {
    return { kind: "user", display: "name" };
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

  if (kind === "wizard-progress") {
    return {
      kind: "wizard-progress",
      variant: "bar",
      stepLabel: { show: true, position: "top", bold: true },
      conditionalStyles: [],
    };
  }

  if (kind === "wizard-step-host") {
    return { kind: "wizard-step-host" };
  }

  if (kind === "wizard-actions") {
    return { kind: "wizard-actions" };
  }

  if (kind === "container") {
    return { kind: "container", rows: [] };
  }

  return {
    kind,
    primary: { type: "field", path: fieldPath },
  } as UiComponentConfig;
}

export function createDefaultStaticComponent(
  kind: UiComponentKind,
): UiComponentConfig {
  if (kind === "metric-kpi") {
    return {
      kind: "metric-kpi",
      metricDefinitionId: "",
      groupBindings: {},
      dimensionBindings: {},
    };
  }

  if (kind === "metric-derived-kpi") {
    return {
      kind: "metric-derived-kpi",
      expression: DEFAULT_METRIC_DERIVED_EXPRESSION,
      groupBindings: {},
      dimensionBindings: {},
    };
  }

  if (kind === "metric-widget") {
    return {
      kind: "metric-widget",
      entityName: "",
      widgetId: "",
    };
  }

  if (kind === "query-viewer") {
    return {
      kind: "query-viewer",
      entityQueryDefinitionId: "",
      rows: [],
    };
  }

  if (kind === "dashboard-section") {
    return {
      kind: "dashboard-section",
      sectionId: "",
    };
  }

  if (kind === "view-search" || kind === "view-filter") {
    return {
      kind: "view-filter",
      enableSearch: true,
      enableFilters: true,
      filters: [],
    };
  }

  if (kind === "form-field") {
    return { kind: "form-field", fieldPath: "" };
  }

  if (kind === "entity-field-selector") {
    return {
      kind: "entity-field-selector",
      fieldPath: "",
      layout: "list",
      enableSearch: true,
    };
  }

  if (kind === "form-section") {
    return { kind: "form-section", title: "Section" };
  }

  if (kind === "icon") {
    return { kind: "icon", iconName: "CircleCheck" };
  }

  if (kind === "user") {
    return { kind: "user", display: "name" };
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

  if (kind === "wizard-progress") {
    return {
      kind: "wizard-progress",
      variant: "bar",
      stepLabel: { show: true, position: "top", bold: true },
      conditionalStyles: [],
    };
  }

  if (kind === "wizard-step-host") {
    return { kind: "wizard-step-host" };
  }

  if (kind === "wizard-actions") {
    return { kind: "wizard-actions" };
  }

  if (kind === "container") {
    return { kind: "container", rows: [] };
  }

  return {
    kind,
    primary: { type: "static", value: "" },
  } as UiComponentConfig;
}

export function createEmptyColumn(): ColumnNode {
  return { id: createLayoutId("col"), rows: [] };
}

function stripColumnWidthPercent(column: ColumnNode): ColumnNode {
  const { widthPercent: _, ...rest } = column;
  void _;
  return rest;
}

function clearColumnWidthPercents(
  columns: readonly ColumnNode[],
): ColumnNode[] {
  return columns.map(stripColumnWidthPercent);
}

function clampColumnWidthPercent(
  columns: readonly ColumnNode[],
  columnIndex: number,
  percent: number | undefined,
): number | undefined {
  if (percent === undefined) {
    return undefined;
  }

  const clamped = Math.min(100, Math.max(1, Math.round(percent)));
  const autoCount = columns.filter((column, index) =>
    index === columnIndex ? false : column.widthPercent === undefined,
  ).length;

  if (autoCount === 0) {
    return clamped;
  }

  const otherExplicitSum = columns.reduce((total, column, index) => {
    if (index === columnIndex) {
      return total;
    }
    return total + (column.widthPercent ?? 0);
  }, 0);

  const maxAllowed = 100 - otherExplicitSum;
  return Math.min(clamped, Math.max(1, maxAllowed));
}

function withColumnWidthPercent(
  column: ColumnNode,
  widthPercent: number | undefined,
): ColumnNode {
  if (widthPercent === undefined) {
    return stripColumnWidthPercent(column);
  }
  return { ...column, widthPercent };
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

  const nextColumns =
    count < columns.length
      ? clearColumnWidthPercents(columns.slice(0, count))
      : columns.slice(0, count);

  return {
    ...layout,
    root: {
      ...layout.root,
      columnCount: count,
      columns: nextColumns,
    },
  };
}

export function setRootColumnWidthPercent(
  layout: UiLayoutDocument,
  columnIndex: number,
  percent: number | undefined,
): UiLayoutDocument {
  const columns = layout.root.columns.map((column, index) => {
    if (index !== columnIndex) {
      return column;
    }
    const widthPercent = clampColumnWidthPercent(
      layout.root.columns,
      columnIndex,
      percent,
    );
    return withColumnWidthPercent(column, widthPercent);
  });

  return {
    ...layout,
    root: { ...layout.root, columns },
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

    if (row.type === "component" && isRowHolderComponent(row.component)) {
      return {
        ...row,
        component: {
          ...row.component,
          rows: mapNestedRowById(row.component.rows, rowId, updater),
        },
      };
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

    if (row.type === "component" && isRowHolderComponent(row.component)) {
      return {
        ...row,
        component: {
          ...row.component,
          rows: mapNestedColumnRowsById(
            row.component.rows,
            rowId,
            nestedColumnIndex,
            updater,
          ),
        },
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

    const nextColumns =
      count < columns.length
        ? clearColumnWidthPercents(columns.slice(0, count))
        : columns.slice(0, count);

    return {
      ...row,
      columnCount: count,
      columns: nextColumns,
    };
  });
}

export function setNestedColumnWidthPercent(
  layout: UiLayoutDocument,
  columnIndex: number,
  rowId: string,
  nestedColumnIndex: number,
  percent: number | undefined,
): UiLayoutDocument {
  return updateNestedRowAt(layout, columnIndex, rowId, (row) => ({
    ...row,
    columns: row.columns.map((column, index) => {
      if (index !== nestedColumnIndex) {
        return column;
      }
      const widthPercent = clampColumnWidthPercent(
        row.columns,
        nestedColumnIndex,
        percent,
      );
      return withColumnWidthPercent(column, widthPercent);
    }),
  }));
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

export function updateRootNodeStyles(
  layout: UiLayoutDocument,
  styles: readonly StyleRule[],
): UiLayoutDocument {
  return {
    ...layout,
    root: {
      ...layout.root,
      styles: [...styles],
    },
  };
}

export function updateNestedLayoutRowStyles(
  layout: UiLayoutDocument,
  columnIndex: number,
  rowId: string,
  styles: readonly StyleRule[],
): UiLayoutDocument {
  return updateNestedRowAt(layout, columnIndex, rowId, (row) => ({
    ...row,
    styles: [...styles],
  }));
}

export function updateNestedLayoutRowDisplayRange(
  layout: UiLayoutDocument,
  columnIndex: number,
  rowId: string,
  patch: Partial<Pick<NestedLayoutRowNode, "displayFrom" | "displayTo">>,
): UiLayoutDocument {
  return updateNestedLayoutRowMetaAt(
    layout,
    { scope: "root", columnIndex },
    rowId,
    patch,
  );
}

export function updateNestedLayoutRowMetaAt(
  layout: UiLayoutDocument,
  locator: RowLocator,
  rowId: string,
  patch: Partial<
    Pick<NestedLayoutRowNode, "styles" | "displayFrom" | "displayTo" | "name">
  >,
): UiLayoutDocument {
  return updateRowsAtLocator(layout, locator, (rows) =>
    rows.map((row) =>
      row.type === "nested-layout" && row.id === rowId
        ? stripDisplayRangeIfFull(
            applyStructureNamePatch({ ...row, ...patch }, patch),
          )
        : row,
    ),
  );
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

export function updateRootColumnDisplayRange(
  layout: UiLayoutDocument,
  columnIndex: number,
  patch: Partial<Pick<ColumnNode, "displayFrom" | "displayTo">>,
): UiLayoutDocument {
  const columns = layout.root.columns.map((column, index) =>
    index === columnIndex
      ? stripDisplayRangeIfFull({ ...column, ...patch })
      : column,
  );

  return {
    ...layout,
    root: { ...layout.root, columns },
  };
}

export function updateRootColumnMetaAt(
  layout: UiLayoutDocument,
  columnIndex: number,
  patch: Partial<Pick<ColumnNode, "name">>,
): UiLayoutDocument {
  const columns = layout.root.columns.map((column, index) =>
    index === columnIndex ? applyColumnMetaPatch(column, patch) : column,
  );

  return {
    ...layout,
    root: { ...layout.root, columns },
  };
}

export function updateNestedColumnMetaAt(
  layout: UiLayoutDocument,
  columnIndex: number,
  rowId: string,
  nestedColumnIndex: number,
  patch: Partial<Pick<ColumnNode, "name">>,
): UiLayoutDocument {
  return updateNestedRowAt(layout, columnIndex, rowId, (row) => ({
    ...row,
    columns: row.columns.map((column, index) =>
      index === nestedColumnIndex
        ? applyColumnMetaPatch(column, patch)
        : column,
    ),
  }));
}

export function updateNestedColumnDisplayRange(
  layout: UiLayoutDocument,
  columnIndex: number,
  rowId: string,
  nestedColumnIndex: number,
  patch: Partial<Pick<ColumnNode, "displayFrom" | "displayTo">>,
): UiLayoutDocument {
  return updateNestedRowAt(layout, columnIndex, rowId, (row) => ({
    ...row,
    columns: row.columns.map((column, index) =>
      index === nestedColumnIndex
        ? stripDisplayRangeIfFull({ ...column, ...patch })
        : column,
    ),
  }));
}

export function replaceNestedColumnAt(
  layout: UiLayoutDocument,
  columnIndex: number,
  rowId: string,
  nestedColumnIndex: number,
  column: ColumnNode,
): UiLayoutDocument {
  return updateNestedRowAt(layout, columnIndex, rowId, (row) => ({
    ...row,
    columns: row.columns.map((entry, index) =>
      index === nestedColumnIndex ? { ...column, id: entry.id } : entry,
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

function normalizeColumnNode(column: ColumnNode): ColumnNode {
  return {
    ...column,
    rows: column.rows.map(normalizeRowNode),
  };
}

function normalizeRowNode(row: RowNode): RowNode {
  if (row.type === "component") {
    return row;
  }

  return normalizeNestedLayoutRow(row);
}

function normalizeNestedLayoutRow(
  row: NestedLayoutRowNode,
): NestedLayoutRowNode {
  const columns = row.columns.map(normalizeColumnNode);
  return {
    ...row,
    columns,
    columnCount: columns.length,
  };
}

export function normalizeLayout(layout: UiLayoutDocument): UiLayoutDocument {
  const migrated = migrateViewSearchFilterLayout(layout);
  const columns = migrated.root.columns.map(normalizeColumnNode);
  return {
    ...migrated,
    root: {
      ...migrated.root,
      columns,
      columnCount: columns.length,
    },
  };
}

type RowLocator =
  | { readonly scope: "root"; readonly columnIndex: number }
  | {
      readonly scope: "container";
      readonly columnIndex: number;
      readonly containerRowId: string;
    }
  | {
      readonly scope: "nested";
      readonly columnIndex: number;
      readonly rowId: string;
      readonly nestedColumnIndex: number;
      readonly containerRowId?: string;
    };

function mapContainerRowsById(
  rows: readonly RowNode[],
  containerRowId: string,
  updater: (rows: readonly RowNode[]) => readonly RowNode[],
): readonly RowNode[] {
  return rows.map((row) => {
    if (
      row.type === "component" &&
      row.id === containerRowId &&
      isRowHolderComponent(row.component)
    ) {
      return {
        ...row,
        component: {
          ...row.component,
          rows: updater(row.component.rows),
        },
      };
    }

    if (row.type === "component" && isRowHolderComponent(row.component)) {
      return {
        ...row,
        component: {
          ...row.component,
          rows: mapContainerRowsById(
            row.component.rows,
            containerRowId,
            updater,
          ),
        },
      };
    }

    if (row.type === "nested-layout") {
      return {
        ...row,
        columns: row.columns.map((column) => ({
          ...column,
          rows: mapContainerRowsById(column.rows, containerRowId, updater),
        })),
      };
    }

    return row;
  });
}

function updateContainerRowsAt(
  layout: UiLayoutDocument,
  locator: Extract<RowLocator, { readonly scope: "container" }>,
  updater: (rows: readonly RowNode[]) => readonly RowNode[],
): UiLayoutDocument {
  return updateColumnRows(layout, locator.columnIndex, (rows) =>
    mapContainerRowsById(rows, locator.containerRowId, updater),
  );
}

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

  if (locator.scope === "container") {
    return updateContainerRowsAt(layout, locator, updater);
  }

  if (locator.containerRowId) {
    return updateContainerRowsAt(
      layout,
      {
        scope: "container",
        columnIndex: locator.columnIndex,
        containerRowId: locator.containerRowId,
      },
      (rows) =>
        mapNestedColumnRowsById(
          rows,
          locator.rowId,
          locator.nestedColumnIndex,
          updater,
        ),
    );
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

export type RowInsertPosition = {
  readonly position: "before" | "after";
  readonly referenceRowId?: string;
};

function resolveRowInsertIndex(
  rows: readonly RowNode[],
  insert: RowInsertPosition,
): number {
  if (insert.referenceRowId) {
    const index = rows.findIndex((row) => row.id === insert.referenceRowId);
    if (index >= 0) {
      return insert.position === "before" ? index : index + 1;
    }
  }

  if (insert.position === "before") {
    return 0;
  }

  return rows.length;
}

export function insertRowAt(
  layout: UiLayoutDocument,
  locator: RowLocator,
  insert: RowInsertPosition,
  row: RowNode,
): UiLayoutDocument {
  return updateRowsAtLocator(layout, locator, (rows) => {
    const index = resolveRowInsertIndex(rows, insert);
    const next = [...rows];
    next.splice(index, 0, row);
    return next;
  });
}

export function insertComponentRowAt(
  layout: UiLayoutDocument,
  locator: RowLocator,
  insert: RowInsertPosition,
  component: UiComponentConfig,
): { readonly layout: UiLayoutDocument; readonly rowId: string } {
  const rowId = createLayoutId("row");
  const row: ComponentRowNode = {
    type: "component",
    id: rowId,
    component,
  };
  return {
    layout: insertRowAt(layout, locator, insert, row),
    rowId,
  };
}

export function insertNestedLayoutRowAt(
  layout: UiLayoutDocument,
  locator: RowLocator,
  insert: RowInsertPosition,
  nestedColumnCount = 1,
): { readonly layout: UiLayoutDocument; readonly rowId: string } {
  const count = Math.min(Math.max(1, nestedColumnCount), MAX_NESTED_COLUMNS);
  const rowId = createLayoutId("nested");
  const row: NestedLayoutRowNode = {
    type: "nested-layout",
    id: rowId,
    columnCount: count,
    columns: Array.from({ length: count }, () => createEmptyColumn()),
  };
  return {
    layout: insertRowAt(layout, locator, insert, row),
    rowId,
  };
}

export function addComponentRowAt(
  layout: UiLayoutDocument,
  locator: RowLocator,
  component: UiComponentConfig,
): UiLayoutDocument {
  return insertComponentRowAt(layout, locator, { position: "after" }, component)
    .layout;
}

export function addNestedLayoutRowAt(
  layout: UiLayoutDocument,
  locator: RowLocator,
  nestedColumnCount = 1,
): UiLayoutDocument {
  return insertNestedLayoutRowAt(
    layout,
    locator,
    { position: "after" },
    nestedColumnCount,
  ).layout;
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

function stripDisplayRangeIfFull<
  T extends {
    readonly displayFrom?: ResponsiveGridBreakpoint;
    readonly displayTo?: ResponsiveGridBreakpoint;
  },
>(row: T): T {
  if (!isFullDisplayRange(row.displayFrom, row.displayTo)) {
    return row;
  }
  return Object.fromEntries(
    Object.entries(row).filter(
      ([key]) => key !== "displayFrom" && key !== "displayTo",
    ),
  ) as T;
}

function applyStructureNamePatch<T extends { readonly name?: string }>(
  node: T,
  patch: Partial<Pick<T, "name">>,
): T {
  if (!("name" in patch)) {
    return node;
  }

  const trimmed = patch.name?.trim();
  if (trimmed) {
    return { ...node, name: trimmed };
  }

  return Object.fromEntries(
    Object.entries(node).filter(([key]) => key !== "name"),
  ) as T;
}

function applyColumnMetaPatch<T extends ColumnNode>(
  column: T,
  patch: Partial<Pick<ColumnNode, "name">>,
): T {
  return applyStructureNamePatch<T>(column, patch);
}

export function updateComponentRowMetaAt(
  layout: UiLayoutDocument,
  locator: RowLocator,
  rowId: string,
  patch: Partial<
    Pick<
      ComponentRowNode,
      "styles" | "motion" | "displayFrom" | "displayTo" | "name" | "clickAction"
    >
  >,
): UiLayoutDocument {
  return updateRowsAtLocator(layout, locator, (rows) =>
    rows.map((row) => {
      if (row.type !== "component" || row.id !== rowId) {
        return row;
      }

      let nextRow = { ...row, ...patch } as ComponentRowNode;
      if ("clickAction" in patch && patch.clickAction === undefined) {
        nextRow = Object.fromEntries(
          Object.entries(nextRow).filter(([key]) => key !== "clickAction"),
        ) as ComponentRowNode;
      }

      return stripDisplayRangeIfFull(applyStructureNamePatch(nextRow, patch));
    }),
  );
}

export function replaceLayoutDocument(
  imported: UiLayoutDocument,
): UiLayoutDocument {
  return regenerateLayoutDocumentIds(normalizeLayout(imported));
}

export function replaceComponentRowAt(
  layout: UiLayoutDocument,
  locator: RowLocator,
  rowId: string,
  importedRow: ComponentRowNode,
): UiLayoutDocument {
  const nextRow: ComponentRowNode = { ...importedRow, id: rowId };
  return updateRowsAtLocator(layout, locator, (rows) =>
    rows.map((row) =>
      row.id === rowId && row.type === "component" ? nextRow : row,
    ),
  );
}

export function replaceNestedLayoutRowAt(
  layout: UiLayoutDocument,
  rowId: string,
  importedRow: NestedLayoutRowNode,
): UiLayoutDocument {
  const nextRow: NestedLayoutRowNode = { ...importedRow, id: rowId };
  const columns = layout.root.columns.map((column) => ({
    ...column,
    rows: mapNestedRowById(column.rows, rowId, () => nextRow),
  }));
  return { ...layout, root: { ...layout.root, columns } };
}

export function insertColumnAt(
  layout: UiLayoutDocument,
  index: number,
  column: ColumnNode,
): UiLayoutDocument {
  const columns = [...layout.root.columns];
  const clampedIndex = Math.min(Math.max(0, index), columns.length);
  columns.splice(clampedIndex, 0, column);
  return {
    ...layout,
    root: {
      ...layout.root,
      columnCount: columns.length,
      columns,
    },
  };
}

export function appendComponentRowAt(
  layout: UiLayoutDocument,
  locator: RowLocator,
  row: ComponentRowNode,
): UiLayoutDocument {
  const nextRow = regenerateComponentRowSubtree(row);
  return updateRowsAtLocator(layout, locator, (rows) => [...rows, nextRow]);
}

export function appendNestedLayoutRowAt(
  layout: UiLayoutDocument,
  locator: RowLocator,
  row: NestedLayoutRowNode,
): UiLayoutDocument {
  const nextRow = regenerateNestedLayoutRowSubtree(row);
  return updateRowsAtLocator(layout, locator, (rows) => [...rows, nextRow]);
}

function patchContainerComponent(
  layout: UiLayoutDocument,
  locator: Extract<RowLocator, { readonly scope: "container" }>,
  patch: Partial<Pick<ContainerComponentConfig, "styles" | "stackDirection">>,
): UiLayoutDocument {
  return updateColumnRows(layout, locator.columnIndex, (rows) =>
    rows.map((row) => {
      if (
        row.type !== "component" ||
        row.id !== locator.containerRowId ||
        !isContainerComponent(row.component)
      ) {
        return row;
      }

      return {
        ...row,
        component: {
          ...row.component,
          ...patch,
          styles:
            patch.styles !== undefined
              ? [...patch.styles]
              : row.component.styles,
        },
      };
    }),
  );
}

export function updateContainerStylesAt(
  layout: UiLayoutDocument,
  locator: Extract<RowLocator, { readonly scope: "container" }>,
  styles: readonly StyleRule[],
): UiLayoutDocument {
  return patchContainerComponent(layout, locator, { styles: [...styles] });
}

export type { RowLocator };
