import type { FieldDescriptor } from "@repo/ui-builder-react";
import {
  formatFieldPathLabel,
  isRowHolderComponent,
  resolveContainerChildRows,
  type ColumnNode,
  type ComponentRowNode,
  type NestedLayoutRowNode,
  type RowLocator,
  type RowNode,
  type UiComponentConfig,
  type UiComponentKind,
  type UiLayoutDocument,
} from "@repo/ui-builder-core";

export type InsertAnchor = {
  readonly locator: RowLocator;
  readonly position: "before" | "after";
  readonly referenceRowId?: string;
};

export interface StructureColumnNode {
  readonly type: "column";
  readonly id: string;
  readonly columnIndex: number;
  readonly nestedColumnIndex?: number;
  readonly containerRowId?: string;
  readonly parentRowId?: string;
  readonly label: string;
  readonly rows: readonly StructureRowNode[];
  readonly locator: RowLocator;
}

export type StructureRowNode =
  | StructureComponentRowNode
  | StructureNestedLayoutRowNode;

export interface StructureComponentRowNode {
  readonly type: "component";
  readonly id: string;
  readonly rowId: string;
  readonly kind: UiComponentKind;
  readonly label: string;
  readonly locator: RowLocator;
  readonly childRows?: readonly StructureRowNode[];
}

export interface StructureNestedLayoutRowNode {
  readonly type: "nested-layout";
  readonly id: string;
  readonly rowId: string;
  readonly label: string;
  readonly columnCount: number;
  readonly columns: readonly StructureColumnNode[];
  readonly locator: RowLocator;
}

export interface StructureTreeLabels {
  readonly column: (column: number) => string;
  readonly nestedLayout: (columnCount: number) => string;
  readonly container: string;
  readonly section: string;
  readonly actions: string;
  readonly kindDefaults: Readonly<Partial<Record<UiComponentKind, string>>>;
}

function fieldLabelForPath(
  fieldDescriptors: readonly FieldDescriptor[],
  path: string,
): string {
  const descriptor = fieldDescriptors.find((field) => field.path === path);
  return descriptor?.label ?? formatFieldPathLabel(path);
}

function resolveContentLabel(
  config: UiComponentConfig,
  fieldDescriptors: readonly FieldDescriptor[],
  labels: StructureTreeLabels,
): string {
  const label = "label" in config ? config.label : undefined;
  if (typeof label === "string" && label.length > 0) {
    return label;
  }
  if (label && typeof label === "object" && label.text) {
    return label.text;
  }

  if ("primary" in config && config.primary.type === "field") {
    return fieldLabelForPath(fieldDescriptors, config.primary.path);
  }

  return labels.kindDefaults[config.kind] ?? config.kind;
}

export function resolveComponentRowLabel(
  component: UiComponentConfig,
  fieldDescriptors: readonly FieldDescriptor[],
  labels: StructureTreeLabels,
): string {
  switch (component.kind) {
    case "container":
      return labels.container;
    case "form-field":
    case "entity-field-selector":
      return fieldLabelForPath(fieldDescriptors, component.fieldPath);
    case "form-section":
      return component.title?.trim() || labels.section;
    case "form-actions":
    case "wizard-actions":
      return labels.actions;
    default:
      return resolveContentLabel(component, fieldDescriptors, labels);
  }
}

function resolveCustomName(name?: string): string | undefined {
  const trimmed = name?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : undefined;
}

function resolveDefaultColumnLabel(
  columnIndex: number,
  nestedColumnIndex: number | undefined,
  labels: StructureTreeLabels,
): string {
  return labels.column(
    nestedColumnIndex != null ? nestedColumnIndex + 1 : columnIndex + 1,
  );
}

function resolveDefaultRowNodeLabel(
  row: RowNode,
  fieldDescriptors: readonly FieldDescriptor[],
  labels: StructureTreeLabels,
): string {
  if (row.type === "component") {
    return resolveComponentRowLabel(row.component, fieldDescriptors, labels);
  }

  return labels.nestedLayout(row.columnCount);
}

export function resolveColumnNodeDisplayLabel(
  column: ColumnNode,
  columnIndex: number,
  labels: StructureTreeLabels,
  nestedColumnIndex?: number,
): string {
  return (
    resolveCustomName(column.name) ??
    resolveDefaultColumnLabel(columnIndex, nestedColumnIndex, labels)
  );
}

export function resolveRowNodeDisplayLabel(
  row: RowNode,
  fieldDescriptors: readonly FieldDescriptor[],
  labels: StructureTreeLabels,
): string {
  return (
    resolveCustomName(row.name) ??
    resolveDefaultRowNodeLabel(row, fieldDescriptors, labels)
  );
}

export function resolveDefaultColumnNodeLabel(
  columnIndex: number,
  labels: StructureTreeLabels,
  nestedColumnIndex?: number,
): string {
  return resolveDefaultColumnLabel(columnIndex, nestedColumnIndex, labels);
}

export function resolveDefaultRowNodeLabelForEditor(
  row: RowNode,
  fieldDescriptors: readonly FieldDescriptor[],
  labels: StructureTreeLabels,
): string {
  return resolveDefaultRowNodeLabel(row, fieldDescriptors, labels);
}

type LocatorContext = {
  readonly columnIndex: number;
  readonly containerRowId?: string;
  readonly parentRowId?: string;
  readonly nestedColumnIndex?: number;
};

function buildLocator(context: LocatorContext): RowLocator {
  if (context.parentRowId != null && context.nestedColumnIndex != null) {
    return {
      scope: "nested",
      columnIndex: context.columnIndex,
      rowId: context.parentRowId,
      nestedColumnIndex: context.nestedColumnIndex,
      containerRowId: context.containerRowId,
    };
  }

  if (context.containerRowId != null) {
    return {
      scope: "container",
      columnIndex: context.columnIndex,
      containerRowId: context.containerRowId,
    };
  }

  return { scope: "root", columnIndex: context.columnIndex };
}

function buildColumnNode(
  column: ColumnNode,
  columnIndex: number,
  labels: StructureTreeLabels,
  fieldDescriptors: readonly FieldDescriptor[],
  context: LocatorContext = { columnIndex },
): StructureColumnNode {
  const locator = buildLocator(context);
  const id =
    context.parentRowId != null && context.nestedColumnIndex != null
      ? `col-${context.parentRowId}-${context.nestedColumnIndex}`
      : `col-root-${columnIndex}`;

  return {
    type: "column",
    id,
    columnIndex,
    nestedColumnIndex: context.nestedColumnIndex,
    containerRowId: context.containerRowId,
    parentRowId: context.parentRowId,
    label: resolveColumnNodeDisplayLabel(
      column,
      columnIndex,
      labels,
      context.nestedColumnIndex,
    ),
    rows: column.rows.map((row) =>
      buildRowNode(row, columnIndex, labels, fieldDescriptors, context),
    ),
    locator,
  };
}

function buildRowNode(
  row: RowNode,
  columnIndex: number,
  labels: StructureTreeLabels,
  fieldDescriptors: readonly FieldDescriptor[],
  context: LocatorContext,
): StructureRowNode {
  if (row.type === "component") {
    return buildComponentRowNode(row, context, labels, fieldDescriptors);
  }

  return buildNestedLayoutRowNode(
    row,
    columnIndex,
    labels,
    fieldDescriptors,
    context,
  );
}

function buildComponentRowNode(
  row: ComponentRowNode,
  context: LocatorContext,
  labels: StructureTreeLabels,
  fieldDescriptors: readonly FieldDescriptor[],
): StructureComponentRowNode {
  const locator = buildLocator(context);

  if (isRowHolderComponent(row.component)) {
    const childContext: LocatorContext = {
      columnIndex: context.columnIndex,
      containerRowId: row.id,
    };

    return {
      type: "component",
      id: `row-${row.id}`,
      rowId: row.id,
      kind: row.component.kind,
      label: resolveRowNodeDisplayLabel(row, fieldDescriptors, labels),
      locator,
      childRows: row.component.rows.map((child) =>
        buildRowNode(
          child,
          context.columnIndex,
          labels,
          fieldDescriptors,
          childContext,
        ),
      ),
    };
  }

  return {
    type: "component",
    id: `row-${row.id}`,
    rowId: row.id,
    kind: row.component.kind,
    label: resolveRowNodeDisplayLabel(row, fieldDescriptors, labels),
    locator,
  };
}

function buildNestedLayoutRowNode(
  row: NestedLayoutRowNode,
  columnIndex: number,
  labels: StructureTreeLabels,
  fieldDescriptors: readonly FieldDescriptor[],
  context: LocatorContext,
): StructureNestedLayoutRowNode {
  const locator = buildLocator(context);

  return {
    type: "nested-layout",
    id: `row-${row.id}`,
    rowId: row.id,
    label: resolveRowNodeDisplayLabel(row, fieldDescriptors, labels),
    columnCount: row.columnCount,
    columns: row.columns.map((column, nestedColumnIndex) =>
      buildColumnNode(column, columnIndex, labels, fieldDescriptors, {
        columnIndex,
        containerRowId: context.containerRowId,
        parentRowId: row.id,
        nestedColumnIndex,
      }),
    ),
    locator,
  };
}

export function buildStructureTree(
  layout: UiLayoutDocument,
  labels: StructureTreeLabels,
  fieldDescriptors: readonly FieldDescriptor[],
): readonly StructureColumnNode[] {
  return layout.root.columns.map((column, columnIndex) =>
    buildColumnNode(column, columnIndex, labels, fieldDescriptors),
  );
}

export function resolvePromotedContainerRootRow(
  columns: readonly StructureColumnNode[],
): StructureComponentRowNode | null {
  if (columns.length !== 1) {
    return null;
  }

  const rootColumn = columns[0];
  if (!rootColumn || rootColumn.rows.length !== 1) {
    return null;
  }

  const row = rootColumn.rows[0];
  return row?.type === "component" && row.kind === "container" ? row : null;
}

export function collectDefaultExpandedNodeIdsForLayout(
  columns: readonly StructureColumnNode[],
  options?: { readonly promoteSingleContainerRoot?: boolean },
): string[] {
  if (options?.promoteSingleContainerRoot) {
    const promoted = resolvePromotedContainerRootRow(columns);
    if (promoted) {
      const ids: string[] = [promoted.id];
      collectExpandedRowIds(promoted.childRows ?? [], ids);
      return ids;
    }
  }

  return collectDefaultExpandedNodeIds(columns);
}

function createInsertAnchor(
  locator: RowLocator,
  position: "before" | "after",
  referenceRowId?: string,
): InsertAnchor {
  return { locator, position, referenceRowId };
}

export function createColumnTopInsertAnchor(
  column: StructureColumnNode,
): InsertAnchor {
  const firstRow = column.rows[0];
  return createInsertAnchor(column.locator, "before", firstRow?.rowId);
}

export function createRowBottomInsertAnchor(
  row: StructureRowNode,
): InsertAnchor {
  return createInsertAnchor(row.locator, "after", row.rowId);
}

export function createContainerTopInsertAnchor(
  row: StructureComponentRowNode,
): InsertAnchor {
  const locator: Extract<RowLocator, { readonly scope: "container" }> = {
    scope: "container",
    columnIndex: row.locator.columnIndex,
    containerRowId: row.rowId,
  };
  const firstChild = row.childRows?.[0];
  return createInsertAnchor(locator, "before", firstChild?.rowId);
}

function findNestedRow(
  rows: readonly RowNode[],
  rowId: string,
): NestedLayoutRowNode | null {
  for (const row of rows) {
    if (row.type === "nested-layout" && row.id === rowId) {
      return row;
    }

    if (row.type === "component" && isRowHolderComponent(row.component)) {
      const nested = findNestedRow(row.component.rows, rowId);
      if (nested) {
        return nested;
      }
    }

    if (row.type === "nested-layout") {
      for (const column of row.columns) {
        const nested = findNestedRow(column.rows, rowId);
        if (nested) {
          return nested;
        }
      }
    }
  }

  return null;
}

function getRowsAtLocator(
  layout: UiLayoutDocument,
  locator: RowLocator,
): readonly RowNode[] {
  if (locator.scope === "root") {
    return layout.root.columns[locator.columnIndex]?.rows ?? [];
  }

  if (locator.scope === "container") {
    const column = layout.root.columns[locator.columnIndex];
    return (
      resolveContainerChildRows(column?.rows ?? [], locator.containerRowId) ??
      []
    );
  }

  const column = layout.root.columns[locator.columnIndex];
  if (!column) {
    return [];
  }

  const searchRows =
    locator.containerRowId != null
      ? (resolveContainerChildRows(column.rows, locator.containerRowId) ?? [])
      : column.rows;

  const nestedRow = findNestedRow(searchRows, locator.rowId);
  if (!nestedRow) {
    return [];
  }

  return nestedRow.columns[locator.nestedColumnIndex]?.rows ?? [];
}

export function getRowMoveState(
  layout: UiLayoutDocument,
  row: StructureRowNode,
): { readonly canMoveUp: boolean; readonly canMoveDown: boolean } {
  const rows = getRowsAtLocator(layout, row.locator);
  const index = rows.findIndex((entry) => entry.id === row.rowId);

  return {
    canMoveUp: index > 0,
    canMoveDown: index >= 0 && index < rows.length - 1,
  };
}

export function collectDefaultExpandedNodeIds(
  columns: readonly StructureColumnNode[],
): string[] {
  const ids: string[] = [];

  for (const column of columns) {
    ids.push(column.id);
    collectExpandedRowIds(column.rows, ids);
  }

  return ids;
}

function collectExpandedRowIds(
  rows: readonly StructureRowNode[],
  ids: string[],
): void {
  for (const row of rows) {
    if (row.type === "component" && row.kind === "container") {
      ids.push(row.id);
      collectExpandedRowIds(row.childRows ?? [], ids);
      continue;
    }

    if (row.type === "component" && row.childRows) {
      ids.push(row.id);
      collectExpandedRowIds(row.childRows, ids);
    }

    if (row.type === "nested-layout") {
      ids.push(row.id);
      for (const column of row.columns) {
        ids.push(column.id);
        collectExpandedRowIds(column.rows, ids);
      }
    }
  }
}
