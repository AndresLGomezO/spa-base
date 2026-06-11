import type { FieldDescriptor } from "@repo/ui-builder-react";
import {
  formatFieldPathLabel,
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

function buildLocator(
  columnIndex: number,
  parentRowId?: string,
  nestedColumnIndex?: number,
): RowLocator {
  if (parentRowId != null && nestedColumnIndex != null) {
    return {
      scope: "nested",
      columnIndex,
      rowId: parentRowId,
      nestedColumnIndex,
    };
  }

  return { scope: "root", columnIndex };
}

function buildColumnNode(
  column: ColumnNode,
  columnIndex: number,
  labels: StructureTreeLabels,
  fieldDescriptors: readonly FieldDescriptor[],
  parentRowId?: string,
  nestedColumnIndex?: number,
): StructureColumnNode {
  const locator = buildLocator(columnIndex, parentRowId, nestedColumnIndex);
  const id =
    parentRowId != null && nestedColumnIndex != null
      ? `col-${parentRowId}-${nestedColumnIndex}`
      : `col-root-${columnIndex}`;

  return {
    type: "column",
    id,
    columnIndex,
    nestedColumnIndex,
    parentRowId,
    label: labels.column(
      nestedColumnIndex != null ? nestedColumnIndex + 1 : columnIndex + 1,
    ),
    rows: column.rows.map((row) =>
      buildRowNode(row, columnIndex, labels, fieldDescriptors, locator),
    ),
    locator,
  };
}

function buildRowNode(
  row: RowNode,
  columnIndex: number,
  labels: StructureTreeLabels,
  fieldDescriptors: readonly FieldDescriptor[],
  locator: RowLocator,
): StructureRowNode {
  if (row.type === "component") {
    return buildComponentRowNode(row, locator, labels, fieldDescriptors);
  }

  return buildNestedLayoutRowNode(
    row,
    columnIndex,
    labels,
    fieldDescriptors,
    locator,
  );
}

function buildComponentRowNode(
  row: ComponentRowNode,
  locator: RowLocator,
  labels: StructureTreeLabels,
  fieldDescriptors: readonly FieldDescriptor[],
): StructureComponentRowNode {
  return {
    type: "component",
    id: `row-${row.id}`,
    rowId: row.id,
    kind: row.component.kind,
    label: resolveComponentRowLabel(row.component, fieldDescriptors, labels),
    locator,
  };
}

function buildNestedLayoutRowNode(
  row: NestedLayoutRowNode,
  columnIndex: number,
  labels: StructureTreeLabels,
  fieldDescriptors: readonly FieldDescriptor[],
  locator: RowLocator,
): StructureNestedLayoutRowNode {
  return {
    type: "nested-layout",
    id: `row-${row.id}`,
    rowId: row.id,
    label: labels.nestedLayout(row.columnCount),
    columnCount: row.columnCount,
    columns: row.columns.map((column, nestedColumnIndex) =>
      buildColumnNode(
        column,
        columnIndex,
        labels,
        fieldDescriptors,
        row.id,
        nestedColumnIndex,
      ),
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

function getRowsAtLocator(
  layout: UiLayoutDocument,
  locator: RowLocator,
): readonly RowNode[] {
  if (locator.scope === "root") {
    return layout.root.columns[locator.columnIndex]?.rows ?? [];
  }

  const column = layout.root.columns[locator.columnIndex];
  if (!column) {
    return [];
  }

  const nestedRow = column.rows.find(
    (row): row is NestedLayoutRowNode =>
      row.type === "nested-layout" && row.id === locator.rowId,
  );
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
    if (row.type === "nested-layout") {
      ids.push(row.id);
      for (const column of row.columns) {
        ids.push(column.id);
        collectExpandedRowIds(column.rows, ids);
      }
    }
  }
}
