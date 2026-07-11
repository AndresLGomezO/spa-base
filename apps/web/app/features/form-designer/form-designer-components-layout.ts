import type { DesignSurface } from "@repo/ui-builder-core";
import {
  createDefaultChartComponent,
  createDefaultComponent,
  createDefaultStaticComponent,
  insertComponentRowAt,
  insertGridRowAt,
  insertRowAt,
  isGridComponent,
  isRowHolderComponent,
  resolveContainerChildRows,
  updateComponentRowAt,
  updateComponentRowMetaAt,
  resolveLayoutRootColumns,
  withEditableRootColumns,
  type ColumnNode,
  type ComponentRowNode,
  type RowNode,
  type StyleRule,
  type UiLayoutDocument,
} from "@repo/ui-builder-core";
import type { FieldDescriptor } from "@repo/ui-builder-react";
import {
  createLayoutEditorBinding,
  type LayoutEditorBinding,
} from "@repo/ui-builder-react";

import type { UseEntityFormLayoutEditorResult } from "../ui-builder/use-entity-form-layout-editor";
import type { ComponentCatalogEntry } from "./form-designer-component-catalog";
import type { ComponentColumnRef } from "./form-designer-component-column-ref";
import { isNestedComponentColumnRef } from "./form-designer-component-column-ref";
import type { ComponentRowRef } from "./form-designer-component-row-ref";
import { toComponentRowRef } from "./form-designer-component-row-ref";
import type {
  InsertAnchor,
  StructureTreeLabels,
} from "./form-designer-structure-tree";
import {
  resolveColumnNodeDisplayLabel,
  resolveComponentRowLabel,
  resolveDefaultColumnNodeLabel,
} from "./form-designer-structure-tree";

export type ComponentsTreeScope = "shell" | "step" | "footer" | "main";

export function resolveComponentsDesignSurface(
  presentation: "plain" | "wizard",
  treeScope: ComponentsTreeScope,
): DesignSurface {
  if (treeScope === "footer") {
    return "formModalFooter";
  }

  if (presentation === "wizard") {
    return treeScope === "shell" ? "formWizardShell" : "formWizardStep";
  }

  return "formPlain";
}

export type ComponentsLayoutBinding = LayoutEditorBinding;

interface ResolvedComponentColumn {
  readonly column: ColumnNode;
  readonly siblingColumns: readonly ColumnNode[];
  readonly parentGridRow?: ComponentRowNode;
}

function resolveActiveLayout(
  presentation: "plain" | "wizard",
  plainLayout: UiLayoutDocument,
  shellLayout: UiLayoutDocument,
  stepLayout: UiLayoutDocument | undefined,
  footerLayout: UiLayoutDocument | undefined,
  treeScope: ComponentsTreeScope,
): UiLayoutDocument {
  if (treeScope === "footer" && footerLayout) {
    return footerLayout;
  }

  if (presentation === "wizard") {
    if (treeScope === "shell") {
      return shellLayout;
    }

    if (treeScope === "step") {
      return stepLayout ?? shellLayout;
    }
  }

  return plainLayout;
}

export function clampComponentsStepIndex(
  stepIndex: number,
  stepCount: number,
): number {
  return Math.min(stepIndex, Math.max(0, stepCount - 1));
}

export function readScopedLayoutSnapshot(
  editor: Pick<
    UseEntityFormLayoutEditorResult,
    "presentation" | "plainLayout" | "wizard" | "modalFooterLayout"
  >,
  treeScope: ComponentsTreeScope,
  stepIndex: number,
): UiLayoutDocument {
  const clampedStepIndex = clampComponentsStepIndex(
    stepIndex,
    editor.wizard.steps.length,
  );
  const stepLayout = editor.wizard.steps[clampedStepIndex]?.layout;

  return structuredClone(
    resolveActiveLayout(
      editor.presentation,
      editor.plainLayout,
      editor.wizard.shellLayout,
      stepLayout,
      editor.modalFooterLayout,
      treeScope,
    ),
  );
}

export function applyScopedLayoutSnapshot(
  editor: Pick<
    UseEntityFormLayoutEditorResult,
    | "presentation"
    | "setPlainLayout"
    | "setShellLayout"
    | "updateStep"
    | "setModalFooterLayout"
    | "modalFooterLayout"
    | "wizard"
  >,
  snapshot: UiLayoutDocument,
  treeScope: ComponentsTreeScope,
  stepIndex: number,
): void {
  const clampedStepIndex = clampComponentsStepIndex(
    stepIndex,
    editor.wizard.steps.length,
  );

  if (treeScope === "footer" && editor.modalFooterLayout) {
    editor.setModalFooterLayout(snapshot);
    return;
  }

  if (editor.presentation === "wizard") {
    if (treeScope === "shell") {
      editor.setShellLayout(snapshot);
      return;
    }

    if (treeScope === "step") {
      editor.updateStep(clampedStepIndex, { layout: snapshot });
      return;
    }
  }

  editor.setPlainLayout(snapshot);
}

function containerTrackToColumnNode(trackRow: ComponentRowNode): ColumnNode {
  if (!isRowHolderComponent(trackRow.component)) {
    return {
      id: trackRow.id,
      name: trackRow.name,
      rows: [trackRow],
      displayFrom: trackRow.displayFrom,
      displayTo: trackRow.displayTo,
    };
  }

  return {
    id: trackRow.id,
    name: trackRow.name,
    rows: isRowHolderComponent(trackRow.component)
      ? trackRow.component.rows
      : [trackRow],
    styles: isRowHolderComponent(trackRow.component)
      ? trackRow.component.styles
      : undefined,
    stackDirection:
      trackRow.component.kind === "container" ||
      trackRow.component.kind === "query-viewer"
        ? trackRow.component.stackDirection
        : undefined,
    displayFrom: trackRow.displayFrom,
    displayTo: trackRow.displayTo,
  };
}

function replaceRootColumnAt(
  layout: UiLayoutDocument,
  columnIndex: number,
  column: ColumnNode,
): UiLayoutDocument {
  return withEditableRootColumns(layout, (columns) =>
    columns.map((entry, index) => (index === columnIndex ? column : entry)),
  );
}

function gridTrackRowRef(
  columnRef: ComponentColumnRef,
  parentGridRow: ComponentRowNode,
  trackRowId: string,
): ComponentRowRef {
  return toComponentRowRef(trackRowId, {
    scope: "container",
    columnIndex: columnRef.rootColumnIndex,
    containerRowId: parentGridRow.id,
  });
}

function resolveGridTrackRowNode(
  columnRef: ComponentColumnRef,
  parentGridRow: ComponentRowNode | undefined,
): ComponentRowNode | undefined {
  if (
    !isNestedComponentColumnRef(columnRef) ||
    !parentGridRow ||
    parentGridRow.type !== "component" ||
    !isGridComponent(parentGridRow.component)
  ) {
    return undefined;
  }

  const trackRow = parentGridRow.component.rows[columnRef.nestedColumnIndex];
  return trackRow?.type === "component" ? trackRow : undefined;
}

export function resolveGridTrackRowLayoutStyles(
  columnRef: ComponentColumnRef,
  parentGridRow: ComponentRowNode | undefined,
): readonly StyleRule[] | undefined {
  const trackRow = resolveGridTrackRowNode(columnRef, parentGridRow);
  if (!trackRow) {
    return undefined;
  }

  if (isRowHolderComponent(trackRow.component)) {
    return trackRow.component.styles;
  }

  return trackRow.styles;
}

export function isGridTrackColumnRef(
  columnRef: ComponentColumnRef,
  parentGridRow: ComponentRowNode | undefined,
): boolean {
  return (
    isNestedComponentColumnRef(columnRef) &&
    parentGridRow?.type === "component" &&
    isGridComponent(parentGridRow.component)
  );
}

export function updateGridTrackRowLayoutStyles(
  binding: ComponentsLayoutBinding,
  columnRef: ComponentColumnRef,
  parentGridRow: ComponentRowNode | undefined,
  styles: readonly StyleRule[],
): boolean {
  const trackRow = resolveGridTrackRowNode(columnRef, parentGridRow);
  if (!trackRow || !parentGridRow) {
    return false;
  }

  binding.updateComponent(
    gridTrackRowRef(columnRef, parentGridRow, trackRow.id),
    {
      ...trackRow.component,
      styles: [...styles],
    },
  );
  return true;
}

export function applyComponentsColumnPatch(
  binding: ComponentsLayoutBinding,
  columnRef: ComponentColumnRef,
  parentGridRow: ComponentRowNode | undefined,
  patch: Parameters<ComponentsLayoutBinding["updateRootColumn"]>[1],
): void {
  if (isNestedComponentColumnRef(columnRef)) {
    const trackRow =
      parentGridRow?.type === "component" &&
      isGridComponent(parentGridRow.component)
        ? parentGridRow.component.rows[columnRef.nestedColumnIndex]
        : undefined;
    if (!trackRow || trackRow.type !== "component" || !parentGridRow) {
      return;
    }

    const trackRef = gridTrackRowRef(columnRef, parentGridRow, trackRow.id);

    binding.updateRowMeta(trackRef, {
      name: patch.name,
      displayFrom: patch.displayFrom,
      displayTo: patch.displayTo,
    });

    if (patch.stackDirection !== undefined || patch.styles !== undefined) {
      binding.updateComponent(trackRef, {
        ...trackRow.component,
        ...(patch.stackDirection !== undefined &&
        (trackRow.component.kind === "container" ||
          trackRow.component.kind === "query-viewer")
          ? { stackDirection: patch.stackDirection }
          : {}),
        ...(patch.styles !== undefined ? { styles: [...patch.styles] } : {}),
      });
    }
    return;
  }

  binding.updateRootColumn(columnRef.rootColumnIndex, patch);
}

export function replaceColumnAtRef(
  layout: UiLayoutDocument,
  columnRef: ComponentColumnRef,
  column: ColumnNode,
): UiLayoutDocument {
  if (!isNestedComponentColumnRef(columnRef)) {
    return replaceRootColumnAt(layout, columnRef.rootColumnIndex, column);
  }

  const resolved = findColumnByRef(layout, columnRef);
  const parentGridRow = resolved?.parentGridRow;
  if (
    !parentGridRow ||
    parentGridRow.type !== "component" ||
    !isGridComponent(parentGridRow.component)
  ) {
    return layout;
  }

  const trackRow = parentGridRow.component.rows[columnRef.nestedColumnIndex];
  if (!trackRow || trackRow.type !== "component") {
    return layout;
  }

  const locator = {
    scope: "container" as const,
    columnIndex: columnRef.rootColumnIndex,
    containerRowId: parentGridRow.id,
  };

  let next = updateComponentRowMetaAt(layout, locator, trackRow.id, {
    name: column.name,
    displayFrom: column.displayFrom,
    displayTo: column.displayTo,
  });

  if (isRowHolderComponent(trackRow.component)) {
    next = updateComponentRowAt(layout, locator, trackRow.id, {
      ...trackRow.component,
      rows: column.rows,
      ...(trackRow.component.kind === "container" ||
      trackRow.component.kind === "query-viewer"
        ? {
            stackDirection: column.stackDirection,
            styles: column.styles,
          }
        : { styles: column.styles }),
    });
  }

  return next;
}

export function resolveGridTrackCount(
  parentGridRow: ComponentRowNode | undefined,
): number | undefined {
  if (
    !parentGridRow ||
    parentGridRow.type !== "component" ||
    !isGridComponent(parentGridRow.component)
  ) {
    return undefined;
  }

  return parentGridRow.component.rows.length;
}

function findGridRowById(
  rows: readonly RowNode[],
  rowId: string,
): ComponentRowNode | undefined {
  for (const row of rows) {
    if (row.id === rowId && isGridComponent(row.component)) {
      return row;
    }

    if (isRowHolderComponent(row.component)) {
      const found = findGridRowById(row.component.rows, rowId);
      if (found) {
        return found;
      }
    }
  }

  return undefined;
}

function getSearchRowsForLocator(
  layout: UiLayoutDocument,
  locator: ComponentRowRef["locator"],
): readonly RowNode[] {
  const column = resolveLayoutRootColumns(layout)[locator.columnIndex];
  if (!column) {
    return [];
  }

  if (locator.scope === "container") {
    return resolveContainerChildRows(column.rows, locator.containerRowId) ?? [];
  }

  return column.rows;
}

export function findColumnByRef(
  layout: UiLayoutDocument,
  columnRef: ComponentColumnRef,
): ResolvedComponentColumn | undefined {
  if (isNestedComponentColumnRef(columnRef)) {
    const parentGrid = findGridRowById(
      resolveLayoutRootColumns(layout)[columnRef.rootColumnIndex]?.rows ?? [],
      columnRef.nestedParentRowId,
    );
    if (!parentGrid || !isGridComponent(parentGrid.component)) {
      return undefined;
    }

    const trackRow = parentGrid.component.rows[columnRef.nestedColumnIndex];
    if (!trackRow || trackRow.type !== "component") {
      return undefined;
    }

    const siblingColumns = parentGrid.component.rows
      .filter((row): row is ComponentRowNode => row.type === "component")
      .map(containerTrackToColumnNode);

    return {
      column: containerTrackToColumnNode(trackRow),
      siblingColumns,
      parentGridRow: parentGrid,
    };
  }

  const column = resolveLayoutRootColumns(layout)[columnRef.rootColumnIndex];
  if (!column) {
    return undefined;
  }

  return {
    column,
    siblingColumns: resolveLayoutRootColumns(layout),
  };
}

export function resolveColumnRefDisplayLabel(
  layout: UiLayoutDocument,
  columnRef: ComponentColumnRef,
  labels: StructureTreeLabels,
): string {
  const resolved = findColumnByRef(layout, columnRef);
  const nestedColumnIndex = isNestedComponentColumnRef(columnRef)
    ? columnRef.nestedColumnIndex
    : undefined;

  if (resolved) {
    return resolveColumnNodeDisplayLabel(
      resolved.column,
      columnRef.rootColumnIndex,
      labels,
      nestedColumnIndex,
    );
  }

  return resolveDefaultColumnNodeLabel(
    columnRef.rootColumnIndex,
    labels,
    nestedColumnIndex,
  );
}

export function findRowByRef(
  layout: UiLayoutDocument,
  rowRef: ComponentRowRef,
): RowNode | undefined {
  const { locator, rowId } = rowRef;

  if (locator.scope === "root") {
    return resolveLayoutRootColumns(layout)[locator.columnIndex]?.rows.find(
      (row) => row.id === rowId,
    );
  }

  if (locator.scope === "container") {
    return getSearchRowsForLocator(layout, locator).find(
      (row) => row.id === rowId,
    );
  }

  return undefined;
}

export function areScopedLayoutSnapshotsEqual(
  left: UiLayoutDocument,
  right: UiLayoutDocument,
): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

export function createComponentsLayoutBinding(
  layout: UiLayoutDocument,
  setLayout: (layout: UiLayoutDocument) => void,
): ComponentsLayoutBinding {
  return createLayoutEditorBinding(layout, setLayout);
}

export function resolveComponentsLayoutBinding(
  editor: Pick<
    UseEntityFormLayoutEditorResult,
    | "presentation"
    | "plainLayout"
    | "wizard"
    | "modalFooterLayout"
    | "setPlainLayout"
    | "setShellLayout"
    | "updateStep"
    | "setModalFooterLayout"
  >,
  treeScope: ComponentsTreeScope,
  stepIndex: number,
): ComponentsLayoutBinding {
  const clampedStepIndex = clampComponentsStepIndex(
    stepIndex,
    editor.wizard.steps.length,
  );
  const stepLayout = editor.wizard.steps[clampedStepIndex]?.layout;

  const layout = resolveActiveLayout(
    editor.presentation,
    editor.plainLayout,
    editor.wizard.shellLayout,
    stepLayout,
    editor.modalFooterLayout,
    treeScope,
  );

  const setLayout = (nextLayout: UiLayoutDocument) => {
    if (treeScope === "footer" && editor.modalFooterLayout) {
      editor.setModalFooterLayout(nextLayout);
      return;
    }

    if (editor.presentation === "wizard") {
      if (treeScope === "shell") {
        editor.setShellLayout(nextLayout);
        return;
      }

      if (treeScope === "step") {
        editor.updateStep(clampedStepIndex, { layout: nextLayout });
        return;
      }
    }

    editor.setPlainLayout(nextLayout);
  };

  return createComponentsLayoutBinding(layout, setLayout);
}

export function insertCatalogEntryAtAnchor(
  binding: ComponentsLayoutBinding,
  anchor: InsertAnchor,
  entry: ComponentCatalogEntry,
  defaultFieldPath: string,
  treeLabels: StructureTreeLabels,
  fieldDescriptors: readonly FieldDescriptor[],
  options?: { readonly useStaticDefaults?: boolean },
): { readonly rowRef: ComponentRowRef; readonly label: string } {
  const kind = entry.kind;
  const insert = {
    position: anchor.position,
    referenceRowId: anchor.referenceRowId,
  };

  if (kind === "grid") {
    const { layout, rowId } = insertGridRowAt(
      binding.layout,
      anchor.locator,
      insert,
      { trackCount: 2 },
    );
    binding.setLayout(layout);
    return {
      rowRef: toComponentRowRef(rowId, anchor.locator),
      label: treeLabels.grid(2),
    };
  }

  let component = options?.useStaticDefaults
    ? createDefaultStaticComponent(kind)
    : createDefaultComponent(kind, defaultFieldPath);

  if (kind === "chart" && entry.defaultChartType) {
    component = createDefaultChartComponent();
  }

  const { layout, rowId } = insertComponentRowAt(
    binding.layout,
    anchor.locator,
    insert,
    component,
  );
  binding.setLayout(layout);
  return {
    rowRef: toComponentRowRef(rowId, anchor.locator),
    label: resolveComponentRowLabel(component, fieldDescriptors, treeLabels),
  };
}

export function insertImportedRowAtAnchor(
  binding: ComponentsLayoutBinding,
  anchor: InsertAnchor,
  row: ComponentRowNode,
  fieldDescriptors: readonly FieldDescriptor[],
  treeLabels: StructureTreeLabels,
): { readonly rowRef: ComponentRowRef; readonly label: string } {
  const layout = insertRowAt(
    binding.layout,
    anchor.locator,
    {
      position: anchor.position,
      referenceRowId: anchor.referenceRowId,
    },
    row,
  );
  binding.setLayout(layout);

  const label =
    row.component.kind === "grid"
      ? treeLabels.grid(row.component.rows.length)
      : resolveComponentRowLabel(row.component, fieldDescriptors, treeLabels);

  return {
    rowRef: toComponentRowRef(row.id, anchor.locator),
    label,
  };
}
