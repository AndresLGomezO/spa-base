import {
  resolveFormModalFooterLayout,
  resolvePlainFormLayout,
  resolveWizardForm,
  type SerializableEntityDefinition,
  type WizardFormConfig,
} from "@repo/entities";
import {
  createDefaultWizardShellLayout,
  ensureWizardShellLayout,
  type ColumnNode,
  type ComponentRowNode,
  type NestedLayoutRowNode,
  type RowNode,
  type UiLayoutDocument,
} from "@repo/ui-builder-core";

import type { UseEntityFormLayoutEditorResult } from "../ui-builder/use-entity-form-layout-editor";

interface FormDesignerComponentsSnapshot {
  readonly plainLayout: UiLayoutDocument;
  readonly wizard: WizardFormConfig;
  readonly modalFooterLayout?: UiLayoutDocument;
}

type ComponentsRowTree =
  | ComponentRowNode
  | (Omit<NestedLayoutRowNode, "columns"> & {
      readonly columns: readonly ComponentsColumnTree[];
    });

interface ComponentsColumnTree {
  readonly rows: readonly ComponentsRowTree[];
}

export interface ComponentsLayoutTree {
  readonly columns: readonly ComponentsColumnTree[];
}

export interface FormDesignerComponentsTreeSnapshot {
  readonly plainLayout: ComponentsLayoutTree;
  readonly wizardShell: ComponentsLayoutTree;
  readonly wizardSteps: readonly {
    readonly id: string;
    readonly layout: ComponentsLayoutTree;
  }[];
  readonly modalFooterLayout?: ComponentsLayoutTree;
}

function extractRowTree(row: RowNode): ComponentsRowTree {
  if (row.type === "component") {
    return structuredClone(row);
  }

  return {
    type: "nested-layout",
    id: row.id,
    columnCount: row.columnCount,
    columns: row.columns.map(extractColumnTree),
    styles: row.styles,
    displayFrom: row.displayFrom,
    displayTo: row.displayTo,
  };
}

function extractColumnTree(column: ColumnNode): ComponentsColumnTree {
  return {
    rows: column.rows.map(extractRowTree),
  };
}

function extractComponentsTree(layout: UiLayoutDocument): ComponentsLayoutTree {
  return {
    columns: layout.root.columns.map(extractColumnTree),
  };
}

export function readComponentsTreeSnapshot(
  editor: Pick<
    UseEntityFormLayoutEditorResult,
    "plainLayout" | "wizard" | "modalFooterLayout"
  >,
): FormDesignerComponentsTreeSnapshot {
  return {
    plainLayout: extractComponentsTree(editor.plainLayout),
    wizardShell: extractComponentsTree(editor.wizard.shellLayout),
    wizardSteps: editor.wizard.steps.map((step) => ({
      id: step.id,
      layout: extractComponentsTree(step.layout),
    })),
    modalFooterLayout: editor.modalFooterLayout
      ? extractComponentsTree(editor.modalFooterLayout)
      : undefined,
  };
}

export function readComponentsTreeSnapshotFromFull(
  snapshot: FormDesignerComponentsSnapshot,
): FormDesignerComponentsTreeSnapshot {
  return {
    plainLayout: extractComponentsTree(snapshot.plainLayout),
    wizardShell: extractComponentsTree(snapshot.wizard.shellLayout),
    wizardSteps: snapshot.wizard.steps.map((step) => ({
      id: step.id,
      layout: extractComponentsTree(step.layout),
    })),
    modalFooterLayout: snapshot.modalFooterLayout
      ? extractComponentsTree(snapshot.modalFooterLayout)
      : undefined,
  };
}

export function readComponentsSnapshotFromDefinition(
  definition: SerializableEntityDefinition,
): FormDesignerComponentsSnapshot {
  const footerLayout = resolveFormModalFooterLayout(definition);
  const plainLayout = resolvePlainFormLayout(definition);
  const resolvedWizard = resolveWizardForm(definition);
  const wizard = resolvedWizard
    ? structuredClone({
        ...resolvedWizard,
        shellLayout: ensureWizardShellLayout(resolvedWizard.shellLayout, {
          actionsInModalFooter: footerLayout != null,
        }),
      })
    : structuredClone({
        shellLayout: ensureWizardShellLayout(createDefaultWizardShellLayout(), {
          actionsInModalFooter: footerLayout != null,
        }),
        steps: [],
      });

  return {
    plainLayout: structuredClone(plainLayout),
    wizard,
    modalFooterLayout: footerLayout ? structuredClone(footerLayout) : undefined,
  };
}

function lastColumnIndexWithRows(tree: ComponentsLayoutTree): number {
  for (let index = tree.columns.length - 1; index >= 0; index -= 1) {
    if ((tree.columns[index]?.rows.length ?? 0) > 0) {
      return index;
    }
  }

  return -1;
}

function areComponentsLayoutTreesEqual(
  left: ComponentsLayoutTree,
  right: ComponentsLayoutTree,
): boolean {
  const lastIndex = Math.max(
    lastColumnIndexWithRows(left),
    lastColumnIndexWithRows(right),
  );

  for (let index = 0; index <= lastIndex; index += 1) {
    const leftRows = left.columns[index]?.rows ?? [];
    const rightRows = right.columns[index]?.rows ?? [];
    if (JSON.stringify(leftRows) !== JSON.stringify(rightRows)) {
      return false;
    }
  }

  return true;
}

export function areComponentsTreeSnapshotsEqual(
  left: FormDesignerComponentsTreeSnapshot,
  right: FormDesignerComponentsTreeSnapshot,
): boolean {
  if (
    !areComponentsLayoutTreesEqual(left.plainLayout, right.plainLayout) ||
    !areComponentsLayoutTreesEqual(left.wizardShell, right.wizardShell)
  ) {
    return false;
  }

  if (left.wizardSteps.length !== right.wizardSteps.length) {
    return false;
  }

  for (let index = 0; index < left.wizardSteps.length; index += 1) {
    const leftStep = left.wizardSteps[index];
    const rightStep = right.wizardSteps[index];
    if (
      leftStep?.id !== rightStep?.id ||
      !areComponentsLayoutTreesEqual(leftStep.layout, rightStep.layout)
    ) {
      return false;
    }
  }

  if (Boolean(left.modalFooterLayout) !== Boolean(right.modalFooterLayout)) {
    return false;
  }

  if (left.modalFooterLayout && right.modalFooterLayout) {
    return areComponentsLayoutTreesEqual(
      left.modalFooterLayout,
      right.modalFooterLayout,
    );
  }

  return true;
}

export function applyComponentsTreeSnapshotToEditor(
  editor: Pick<
    UseEntityFormLayoutEditorResult,
    | "plainLayout"
    | "wizard"
    | "modalFooterLayout"
    | "setPlainLayout"
    | "setWizard"
    | "setModalFooterLayout"
    | "disableModalFooterLayout"
  >,
  treeSnapshot: FormDesignerComponentsTreeSnapshot,
): void {
  editor.setPlainLayout(
    applyComponentsTreeToLayout(editor.plainLayout, treeSnapshot.plainLayout),
  );
  editor.setWizard({
    ...editor.wizard,
    shellLayout: ensureWizardShellLayout(
      applyComponentsTreeToLayout(
        editor.wizard.shellLayout,
        treeSnapshot.wizardShell,
      ),
      { actionsInModalFooter: editor.modalFooterLayout != null },
    ),
    steps: editor.wizard.steps.map((step) => {
      const stepTree = treeSnapshot.wizardSteps.find(
        (entry) => entry.id === step.id,
      );
      if (!stepTree) {
        return step;
      }

      return {
        ...step,
        layout: applyComponentsTreeToLayout(step.layout, stepTree.layout),
      };
    }),
  });

  if (treeSnapshot.modalFooterLayout && editor.modalFooterLayout) {
    editor.setModalFooterLayout(
      applyComponentsTreeToLayout(
        editor.modalFooterLayout,
        treeSnapshot.modalFooterLayout,
      ),
    );
  }
}

function applyComponentsTreeToLayout(
  currentLayout: UiLayoutDocument,
  tree: ComponentsLayoutTree,
): UiLayoutDocument {
  return {
    ...currentLayout,
    root: {
      ...currentLayout.root,
      columns: currentLayout.root.columns.map((column, columnIndex) => ({
        ...column,
        rows: mergeRows(column.rows, tree.columns[columnIndex]?.rows ?? []),
      })),
    },
  };
}

function mergeRows(
  currentRows: readonly RowNode[],
  treeRows: readonly ComponentsRowTree[],
): readonly RowNode[] {
  return treeRows.map((treeRow) => {
    const existing = currentRows.find((row) => row.id === treeRow.id);
    if (!existing) {
      return structuredClone(treeRow) as RowNode;
    }

    if (treeRow.type === "component" && existing.type === "component") {
      return structuredClone(treeRow);
    }

    if (treeRow.type === "nested-layout" && existing.type === "nested-layout") {
      return {
        ...existing,
        columnCount: treeRow.columnCount,
        styles: treeRow.styles,
        displayFrom: treeRow.displayFrom,
        displayTo: treeRow.displayTo,
        columns: existing.columns.map((column, columnIndex) => ({
          ...column,
          rows: mergeRows(
            column.rows,
            treeRow.columns[columnIndex]?.rows ?? [],
          ),
        })),
      };
    }

    return structuredClone(treeRow) as RowNode;
  });
}
