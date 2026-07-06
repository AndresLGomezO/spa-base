import type {
  ColumnNode,
  ComponentRowNode,
  LayoutAlign,
  LayoutRootNode,
  RowNode,
  UiLayoutDocument,
} from "../types/layout.js";
import type { UiComponentConfig, UiComponentKind } from "../types/component.js";
import { createDefaultChartComponent } from "../types/component.js";
import type { ContainerComponentConfig } from "../types/component.js";
import {
  isContainerComponent,
  isGridComponent,
  isRowHolderComponent,
} from "../types/component.js";
import type { StyleRule } from "../styles/style-types.js";
import { isFullDisplayRange } from "../layout/component-display-range.js";
import type { ResponsiveGridBreakpoint } from "../layout/responsive-grid.js";
import { createLayoutId } from "./id.js";
import { regenerateLayoutDocumentIds } from "../validation/regenerate-layout-ids.js";
import { regenerateComponentRowSubtree } from "../validation/regenerate-layout-ids.js";
import { migrateViewSearchFilterLayout } from "../layout/migrate-view-search-filter-layout.js";
import { toEditableLayoutRoot } from "../layout/layout-root-adapters.js";
import { resolveLayoutRootColumns } from "../layout/layout-root-adapters.js";
import { resolveContainerChildRows } from "../layout/resolve-container-child-rows.js";

function editableRoot(layout: UiLayoutDocument): LayoutRootNode {
  return toEditableLayoutRoot(layout);
}

function withEditableRoot(
  layout: UiLayoutDocument,
  update: (root: LayoutRootNode) => LayoutRootNode,
): UiLayoutDocument {
  return {
    ...layout,
    root: update(editableRoot(layout)),
  };
}

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

  if (kind === "chart") {
    return createDefaultChartComponent();
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

  if (kind === "chart") {
    return createDefaultChartComponent();
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
  const columns = [...editableRoot(layout).columns];

  while (columns.length < count) {
    columns.push(createEmptyColumn());
  }

  const nextColumns =
    count < columns.length
      ? clearColumnWidthPercents(columns.slice(0, count))
      : columns.slice(0, count);

  return withEditableRoot(layout, (root) => ({
    ...root,
    columnCount: count,
    columns: nextColumns,
  }));
}

export function setRootColumnWidthPercent(
  layout: UiLayoutDocument,
  columnIndex: number,
  percent: number | undefined,
): UiLayoutDocument {
  const root = editableRoot(layout);
  const columns = root.columns.map((column, index) => {
    if (index !== columnIndex) {
      return column;
    }
    const widthPercent = clampColumnWidthPercent(
      root.columns,
      columnIndex,
      percent,
    );
    return withColumnWidthPercent(column, widthPercent);
  });

  return withEditableRoot(layout, (current) => ({ ...current, columns }));
}

export function moveRootColumn(
  layout: UiLayoutDocument,
  columnIndex: number,
  direction: -1 | 1,
): UiLayoutDocument {
  const target = columnIndex + direction;
  const columns = [...editableRoot(layout).columns];
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

  return withEditableRoot(layout, (root) => ({ ...root, columns }));
}

export function removeRootColumn(
  layout: UiLayoutDocument,
  columnIndex: number,
): UiLayoutDocument {
  const root = editableRoot(layout);
  if (root.columns.length <= 1) {
    return layout;
  }

  const columns = root.columns.filter((_, index) => index !== columnIndex);
  return withEditableRoot(layout, (current) => ({
    ...current,
    columnCount: columns.length,
    columns,
  }));
}

function updateColumnRows(
  layout: UiLayoutDocument,
  columnIndex: number,
  updater: (rows: readonly RowNode[]) => readonly RowNode[],
): UiLayoutDocument {
  return withEditableRoot(layout, (root) => ({
    ...root,
    columns: root.columns.map((column, index) =>
      index === columnIndex
        ? { ...column, rows: updater(column.rows) }
        : column,
    ),
  }));
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

export function updateRootColumnStyles(
  layout: UiLayoutDocument,
  columnIndex: number,
  styles: readonly StyleRule[],
): UiLayoutDocument {
  return withEditableRoot(layout, (root) => ({
    ...root,
    columns: root.columns.map((column, index) =>
      index === columnIndex ? { ...column, styles: [...styles] } : column,
    ),
  }));
}

export function updateRootNodeStyles(
  layout: UiLayoutDocument,
  styles: readonly StyleRule[],
): UiLayoutDocument {
  return withEditableRoot(layout, (root) => ({
    ...root,
    styles: [...styles],
  }));
}

export function updateRootColumnDisplayRange(
  layout: UiLayoutDocument,
  columnIndex: number,
  patch: Partial<Pick<ColumnNode, "displayFrom" | "displayTo">>,
): UiLayoutDocument {
  return withEditableRoot(layout, (root) => ({
    ...root,
    columns: root.columns.map((column, index) =>
      index === columnIndex
        ? stripDisplayRangeIfFull({ ...column, ...patch })
        : column,
    ),
  }));
}

export function updateRootColumnMetaAt(
  layout: UiLayoutDocument,
  columnIndex: number,
  patch: Partial<Pick<ColumnNode, "name">>,
): UiLayoutDocument {
  return withEditableRoot(layout, (root) => ({
    ...root,
    columns: root.columns.map((column, index) =>
      index === columnIndex ? applyColumnMetaPatch(column, patch) : column,
    ),
  }));
}

export function updateRootColumnStackDirection(
  layout: UiLayoutDocument,
  columnIndex: number,
  stackDirection: ColumnNode["stackDirection"],
): UiLayoutDocument {
  return withEditableRoot(layout, (root) => ({
    ...root,
    columns: root.columns.map((column, index) =>
      index === columnIndex ? { ...column, stackDirection } : column,
    ),
  }));
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
  return row;
}

export function normalizeLayout(layout: UiLayoutDocument): UiLayoutDocument {
  const migrated = migrateViewSearchFilterLayout(layout);
  return withEditableRoot(migrated, (root) => {
    const columns = root.columns.map(normalizeColumnNode);
    return {
      ...root,
      columns,
      columnCount: columns.length,
    };
  });
}

export type RowLocator =
  | { readonly scope: "root"; readonly columnIndex: number }
  | {
      readonly scope: "container";
      readonly columnIndex: number;
      readonly containerRowId: string;
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

function updateRowsAtLocator(
  layout: UiLayoutDocument,
  locator: RowLocator,
  updater: (rows: readonly RowNode[]) => readonly RowNode[],
): UiLayoutDocument {
  if (locator.scope === "root") {
    return updateColumnRows(layout, locator.columnIndex, updater);
  }

  return updateContainerRowsAt(layout, locator, updater);
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

function createEmptyGridTrackRow(): ComponentRowNode {
  return {
    type: "component",
    id: createLayoutId("row"),
    component: {
      kind: "container",
      rows: [],
    },
  };
}

export function resolveGridTrackLocators(
  layout: UiLayoutDocument,
  locator: Extract<RowLocator, { readonly scope: "container" }>,
  gridRowId: string,
): readonly Extract<RowLocator, { readonly scope: "container" }>[] {
  const column = resolveLayoutRootColumns(layout)[locator.columnIndex];
  if (!column) {
    return [];
  }

  const parentRows =
    resolveContainerChildRows(column.rows, locator.containerRowId) ?? [];
  const gridRow = parentRows.find((row) => row.id === gridRowId);
  if (
    !gridRow ||
    gridRow.type !== "component" ||
    !isGridComponent(gridRow.component)
  ) {
    return [];
  }

  return gridRow.component.rows
    .filter((row): row is ComponentRowNode => row.type === "component")
    .map((track) => ({
      scope: "container" as const,
      columnIndex: locator.columnIndex,
      containerRowId: track.id,
    }));
}

export function insertGridRowAt(
  layout: UiLayoutDocument,
  locator: RowLocator,
  insert: RowInsertPosition,
  options?: {
    readonly gridTemplateColumns?: string;
    readonly trackCount?: number;
  },
): { readonly layout: UiLayoutDocument; readonly rowId: string } {
  const trackCount = Math.min(
    Math.max(1, options?.trackCount ?? 1),
    MAX_NESTED_COLUMNS,
  );
  const rowId = createLayoutId("row");
  const row: ComponentRowNode = {
    type: "component",
    id: rowId,
    component: {
      kind: "grid",
      gridTemplateColumns:
        options?.gridTemplateColumns ?? `repeat(${trackCount}, 1fr)`,
      rows: Array.from({ length: trackCount }, () => createEmptyGridTrackRow()),
    },
  };
  return {
    layout: insertRowAt(layout, locator, insert, row),
    rowId,
  };
}

export function setGridTrackCount(
  layout: UiLayoutDocument,
  locator: RowLocator,
  gridRowId: string,
  trackCount: number,
): UiLayoutDocument {
  const count = Math.min(Math.max(1, trackCount), MAX_NESTED_COLUMNS);

  return updateRowsAtLocator(layout, locator, (rows) =>
    rows.map((row) => {
      if (
        row.type !== "component" ||
        row.id !== gridRowId ||
        !isGridComponent(row.component)
      ) {
        return row;
      }

      const tracks = [...row.component.rows];
      while (tracks.length < count) {
        tracks.push(createEmptyGridTrackRow());
      }

      const nextTracks = tracks.slice(0, count);
      const template = row.component.gridTemplateColumns;
      const nextTemplate = template.startsWith("repeat(")
        ? `repeat(${count}, 1fr)`
        : template;

      return {
        ...row,
        component: {
          ...row.component,
          gridTemplateColumns: nextTemplate,
          rows: nextTracks,
        },
      };
    }),
  );
}

export function setGridTemplateColumns(
  layout: UiLayoutDocument,
  locator: RowLocator,
  gridRowId: string,
  gridTemplateColumns: string,
): UiLayoutDocument {
  return updateRowsAtLocator(layout, locator, (rows) =>
    rows.map((row) => {
      if (
        row.type !== "component" ||
        row.id !== gridRowId ||
        !isGridComponent(row.component)
      ) {
        return row;
      }

      return {
        ...row,
        component: {
          ...row.component,
          gridTemplateColumns,
        },
      };
    }),
  );
}

export function updateGridRowMetaAt(
  layout: UiLayoutDocument,
  locator: RowLocator,
  gridRowId: string,
  patch: Partial<
    Pick<ComponentRowNode, "styles" | "displayFrom" | "displayTo" | "name">
  > & {
    readonly gap?: string;
    readonly alignItems?: LayoutAlign;
  },
): UiLayoutDocument {
  return updateRowsAtLocator(layout, locator, (rows) =>
    rows.map((row) => {
      if (
        row.type !== "component" ||
        row.id !== gridRowId ||
        !isGridComponent(row.component)
      ) {
        return row;
      }

      const gridComponent = row.component;
      const { gap, alignItems, ...rowPatch } = patch;
      let nextRow = stripDisplayRangeIfFull(
        applyStructureNamePatch({ ...row, ...rowPatch }, rowPatch),
      );

      if (gap !== undefined) {
        const normalizedGap = gap.trim();
        nextRow = {
          ...nextRow,
          styles: (nextRow.styles ?? []).filter(
            (rule) => rule.property !== "gap",
          ),
          component: {
            ...gridComponent,
            gap: normalizedGap.length > 0 ? normalizedGap : undefined,
            styles: (gridComponent.styles ?? []).filter(
              (rule) => rule.property !== "gap",
            ),
            ...(alignItems !== undefined ? { alignItems } : {}),
          },
        };
        return nextRow;
      }

      return {
        ...nextRow,
        component: {
          ...gridComponent,
          ...(alignItems !== undefined ? { alignItems } : {}),
        },
      };
    }),
  );
}

export function addComponentRowAt(
  layout: UiLayoutDocument,
  locator: RowLocator,
  component: UiComponentConfig,
): UiLayoutDocument {
  return insertComponentRowAt(layout, locator, { position: "after" }, component)
    .layout;
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

export function insertColumnAt(
  layout: UiLayoutDocument,
  index: number,
  column: ColumnNode,
): UiLayoutDocument {
  const columns = [...editableRoot(layout).columns];
  const clampedIndex = Math.min(Math.max(0, index), columns.length);
  columns.splice(clampedIndex, 0, column);
  return withEditableRoot(layout, (root) => ({
    ...root,
    columnCount: columns.length,
    columns,
  }));
}

export function appendComponentRowAt(
  layout: UiLayoutDocument,
  locator: RowLocator,
  row: ComponentRowNode,
): UiLayoutDocument {
  const nextRow = regenerateComponentRowSubtree(row);
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
