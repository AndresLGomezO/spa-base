import type { DesignSurface } from "@repo/ui-builder-core";
import {
  createDefaultComponent,
  createDefaultStaticComponent,
  insertComponentRowAt,
  insertNestedLayoutRowAt,
  isContainerComponent,
  moveRowAt,
  removeRowAt,
  resolveContainerChildRows,
  updateComponentRowAt,
  updateComponentRowMetaAt,
  updateLayoutMeta,
  updateNestedColumnDisplayRange,
  updateNestedColumnStackDirection,
  updateNestedColumnStyles,
  updateNestedLayoutRowMetaAt,
  setNestedColumnCount,
  setNestedColumnWidthPercent,
  setRootColumnWidthPercent,
  updateRootColumnDisplayRange,
  updateRootColumnStackDirection,
  updateRootColumnStyles,
  updateRootNodeStyles,
  type ColumnNode,
  type ComponentRowNode,
  type MotionPreset,
  type NestedLayoutRowNode,
  type RowNode,
  type StyleRule,
  type UiComponentConfig,
  type UiLayoutDocument,
} from "@repo/ui-builder-core";
import type { FieldDescriptor } from "@repo/ui-builder-react";

import type { UseEntityFormLayoutEditorResult } from "../ui-builder/use-entity-form-layout-editor";
import type { CatalogEntryKind } from "./form-designer-component-catalog";
import type { ComponentColumnRef } from "./form-designer-component-column-ref";
import { isNestedComponentColumnRef } from "./form-designer-component-column-ref";
import type { ComponentRowRef } from "./form-designer-component-row-ref";
import { toComponentRowRef } from "./form-designer-component-row-ref";
import type {
  InsertAnchor,
  StructureTreeLabels,
} from "./form-designer-structure-tree";
import { resolveComponentRowLabel } from "./form-designer-structure-tree";

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

export interface ComponentsLayoutBinding {
  readonly layout: UiLayoutDocument;
  readonly setLayout: (layout: UiLayoutDocument) => void;
  readonly removeRow: (rowRef: ComponentRowRef) => void;
  readonly moveRow: (rowRef: ComponentRowRef, direction: -1 | 1) => void;
  readonly updateComponent: (
    rowRef: ComponentRowRef,
    component: UiComponentConfig,
  ) => void;
  readonly updateRowMeta: (
    rowRef: ComponentRowRef,
    patch: Partial<
      Pick<ComponentRowNode, "styles" | "motion" | "displayFrom" | "displayTo">
    >,
  ) => void;
  readonly updateNestedRowMeta: (
    rowRef: ComponentRowRef,
    patch: Partial<
      Pick<NestedLayoutRowNode, "styles" | "displayFrom" | "displayTo">
    >,
  ) => void;
  readonly setNestedRowColumnCount: (
    rowRef: ComponentRowRef,
    columnCount: number,
  ) => void;
  readonly updateLayoutMotion: (motion: MotionPreset | undefined) => void;
  readonly updateNestedColumn: (
    rowRef: ComponentRowRef,
    nestedColumnIndex: number,
    patch: {
      readonly widthPercent?: number | undefined;
      readonly stackDirection?: ColumnNode["stackDirection"];
      readonly styles?: readonly StyleRule[];
      readonly displayFrom?: ColumnNode["displayFrom"];
      readonly displayTo?: ColumnNode["displayTo"];
    },
  ) => void;
  readonly updateRootColumn: (
    columnIndex: number,
    patch: {
      readonly widthPercent?: number | undefined;
      readonly stackDirection?: ColumnNode["stackDirection"];
      readonly styles?: readonly StyleRule[];
      readonly displayFrom?: ColumnNode["displayFrom"];
      readonly displayTo?: ColumnNode["displayTo"];
    },
  ) => void;
  readonly updateRootLayoutStyles: (styles: readonly StyleRule[]) => void;
}

interface ResolvedComponentColumn {
  readonly column: ColumnNode;
  readonly siblingColumns: readonly ColumnNode[];
  readonly parentNestedRow?: NestedLayoutRowNode;
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

function findNestedLayoutRow(
  rows: readonly RowNode[],
  targetRowId: string,
): NestedLayoutRowNode | undefined {
  for (const row of rows) {
    if (row.type === "nested-layout") {
      if (row.id === targetRowId) {
        return row;
      }

      for (const column of row.columns) {
        const nested = findNestedLayoutRow(column.rows, targetRowId);
        if (nested) {
          return nested;
        }
      }
      continue;
    }

    if (row.type === "component" && isContainerComponent(row.component)) {
      const nested = findNestedLayoutRow(row.component.rows, targetRowId);
      if (nested) {
        return nested;
      }
    }
  }

  return undefined;
}

function getSearchRowsForLocator(
  layout: UiLayoutDocument,
  locator: ComponentRowRef["locator"],
): readonly RowNode[] {
  const column = layout.root.columns[locator.columnIndex];
  if (!column) {
    return [];
  }

  if (locator.scope === "container") {
    return resolveContainerChildRows(column.rows, locator.containerRowId) ?? [];
  }

  if (locator.scope === "nested" && locator.containerRowId) {
    return resolveContainerChildRows(column.rows, locator.containerRowId) ?? [];
  }

  return column.rows;
}

export function findColumnByRef(
  layout: UiLayoutDocument,
  columnRef: ComponentColumnRef,
): ResolvedComponentColumn | undefined {
  if (isNestedComponentColumnRef(columnRef)) {
    const parentRow = findNestedLayoutRow(
      layout.root.columns[columnRef.rootColumnIndex]?.rows ?? [],
      columnRef.nestedParentRowId,
    );
    if (!parentRow) {
      return undefined;
    }

    const column = parentRow.columns[columnRef.nestedColumnIndex];
    if (!column) {
      return undefined;
    }

    return {
      column,
      siblingColumns: parentRow.columns,
      parentNestedRow: parentRow,
    };
  }

  const column = layout.root.columns[columnRef.rootColumnIndex];
  if (!column) {
    return undefined;
  }

  return {
    column,
    siblingColumns: layout.root.columns,
  };
}

export function findRowByRef(
  layout: UiLayoutDocument,
  rowRef: ComponentRowRef,
): RowNode | undefined {
  const { locator, rowId } = rowRef;

  if (locator.scope === "root") {
    return layout.root.columns[locator.columnIndex]?.rows.find(
      (row) => row.id === rowId,
    );
  }

  if (locator.scope === "container") {
    return getSearchRowsForLocator(layout, locator).find(
      (row) => row.id === rowId,
    );
  }

  const parentRow = findNestedLayoutRow(
    getSearchRowsForLocator(layout, locator),
    locator.rowId,
  );
  if (!parentRow) {
    return undefined;
  }

  return parentRow.columns[locator.nestedColumnIndex]?.rows.find(
    (row) => row.id === rowId,
  );
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
  let currentLayout = layout;

  const applyLayout = (next: UiLayoutDocument) => {
    currentLayout = next;
    setLayout(next);
  };

  const binding: ComponentsLayoutBinding = {
    get layout() {
      return currentLayout;
    },
    setLayout: applyLayout,
    removeRow: (rowRef: ComponentRowRef) => {
      applyLayout(removeRowAt(currentLayout, rowRef.locator, rowRef.rowId));
    },
    moveRow: (rowRef: ComponentRowRef, direction: -1 | 1) => {
      applyLayout(
        moveRowAt(currentLayout, rowRef.locator, rowRef.rowId, direction),
      );
    },
    updateComponent: (rowRef, component) => {
      applyLayout(
        updateComponentRowAt(
          currentLayout,
          rowRef.locator,
          rowRef.rowId,
          component,
        ),
      );
    },
    updateRowMeta: (rowRef, patch) => {
      applyLayout(
        updateComponentRowMetaAt(
          currentLayout,
          rowRef.locator,
          rowRef.rowId,
          patch,
        ),
      );
    },
    updateNestedRowMeta: (rowRef, patch) => {
      applyLayout(
        updateNestedLayoutRowMetaAt(
          currentLayout,
          rowRef.locator,
          rowRef.rowId,
          patch,
        ),
      );
    },
    setNestedRowColumnCount: (rowRef, columnCount) => {
      applyLayout(
        setNestedColumnCount(
          currentLayout,
          rowRef.locator.columnIndex,
          rowRef.rowId,
          columnCount,
        ),
      );
    },
    updateLayoutMotion: (motion) => {
      applyLayout(updateLayoutMeta(currentLayout, { motion }));
    },
    updateNestedColumn: (rowRef, nestedColumnIndex, patch) => {
      if (rowRef.locator.scope !== "root") {
        return;
      }

      let next = currentLayout;
      if ("widthPercent" in patch) {
        next = setNestedColumnWidthPercent(
          next,
          rowRef.locator.columnIndex,
          rowRef.rowId,
          nestedColumnIndex,
          patch.widthPercent,
        );
      }
      if (patch.stackDirection !== undefined) {
        next = updateNestedColumnStackDirection(
          next,
          rowRef.locator.columnIndex,
          rowRef.rowId,
          nestedColumnIndex,
          patch.stackDirection,
        );
      }
      if (patch.styles !== undefined) {
        next = updateNestedColumnStyles(
          next,
          rowRef.locator.columnIndex,
          rowRef.rowId,
          nestedColumnIndex,
          patch.styles,
        );
      }
      if ("displayFrom" in patch || "displayTo" in patch) {
        next = updateNestedColumnDisplayRange(
          next,
          rowRef.locator.columnIndex,
          rowRef.rowId,
          nestedColumnIndex,
          {
            displayFrom: patch.displayFrom,
            displayTo: patch.displayTo,
          },
        );
      }
      applyLayout(next);
    },
    updateRootColumn: (columnIndex, patch) => {
      let next = currentLayout;
      if ("widthPercent" in patch) {
        next = setRootColumnWidthPercent(next, columnIndex, patch.widthPercent);
      }
      if (patch.stackDirection !== undefined) {
        next = updateRootColumnStackDirection(
          next,
          columnIndex,
          patch.stackDirection,
        );
      }
      if (patch.styles !== undefined) {
        next = updateRootColumnStyles(next, columnIndex, patch.styles);
      }
      if ("displayFrom" in patch || "displayTo" in patch) {
        next = updateRootColumnDisplayRange(next, columnIndex, patch);
      }
      applyLayout(next);
    },
    updateRootLayoutStyles: (styles) => {
      applyLayout(updateRootNodeStyles(currentLayout, styles));
    },
  };

  return binding;
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
  kind: CatalogEntryKind,
  defaultFieldPath: string,
  treeLabels: StructureTreeLabels,
  fieldDescriptors: readonly FieldDescriptor[],
  options?: { readonly useStaticDefaults?: boolean },
): { readonly rowRef: ComponentRowRef; readonly label: string } {
  const insert = {
    position: anchor.position,
    referenceRowId: anchor.referenceRowId,
  };

  if (kind === "nested-layout") {
    const { layout, rowId } = insertNestedLayoutRowAt(
      binding.layout,
      anchor.locator,
      insert,
    );
    binding.setLayout(layout);
    return {
      rowRef: toComponentRowRef(rowId, anchor.locator),
      label: treeLabels.nestedLayout(1),
    };
  }

  const component = options?.useStaticDefaults
    ? createDefaultStaticComponent(kind)
    : createDefaultComponent(kind, defaultFieldPath);
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
