import type { UiLayoutDocument } from "@repo/entities";

import {
  createComponentsLayoutBinding,
  type ComponentsLayoutBinding,
} from "../form-designer/form-designer-components-layout";
import type { UseEntityListLayoutEditorResult } from "../ui-builder/use-entity-list-layout-editor";
import type { ItemListStructureScope } from "./item-list-designer-structure-scope";
import type { ItemListPanelSession } from "./item-list-designer-panel-session";

export function readScopeLayoutSnapshot(
  editor: Pick<
    UseEntityListLayoutEditorResult,
    "layout" | "rowExpandLayout" | "expandableColumns"
  >,
  scope: ItemListStructureScope,
): UiLayoutDocument {
  if (scope.kind === "listItem") {
    return structuredClone(editor.layout);
  }

  if (scope.kind === "expandableRow") {
    return structuredClone(editor.rowExpandLayout);
  }

  const column = editor.expandableColumns[scope.columnIndex];
  return structuredClone(column?.cellLayout ?? editor.rowExpandLayout);
}

function applyScopeLayoutSnapshot(
  editor: Pick<
    UseEntityListLayoutEditorResult,
    | "setLayout"
    | "setRowExpandLayout"
    | "setExpandableColumns"
    | "expandableColumns"
  >,
  snapshot: UiLayoutDocument,
  scope: ItemListStructureScope,
): void {
  if (scope.kind === "listItem") {
    editor.setLayout(snapshot);
    return;
  }

  if (scope.kind === "expandableRow") {
    editor.setRowExpandLayout(snapshot);
    return;
  }

  editor.setExpandableColumns(
    editor.expandableColumns.map((column, index) =>
      index === scope.columnIndex
        ? { ...column, cellLayout: snapshot }
        : column,
    ),
  );
}

export function readGroupedColumnLabel(
  editor: Pick<UseEntityListLayoutEditorResult, "expandableColumns">,
  columnIndex: number,
): string {
  return editor.expandableColumns[columnIndex]?.label ?? "";
}

export function readGroupedColumnDisplayFrom(
  editor: Pick<UseEntityListLayoutEditorResult, "expandableColumns">,
  columnIndex: number,
) {
  return editor.expandableColumns[columnIndex]?.displayFrom;
}

export function readGroupedColumnDisplayTo(
  editor: Pick<UseEntityListLayoutEditorResult, "expandableColumns">,
  columnIndex: number,
) {
  return editor.expandableColumns[columnIndex]?.displayTo;
}

export function readGroupedColumnDisplayFromBaseline(
  editor: Pick<UseEntityListLayoutEditorResult, "expandableColumns">,
  scope: ItemListStructureScope,
) {
  if (scope.kind !== "groupedColumnCell") {
    return undefined;
  }

  return readGroupedColumnDisplayFrom(editor, scope.columnIndex);
}

export function readGroupedColumnDisplayToBaseline(
  editor: Pick<UseEntityListLayoutEditorResult, "expandableColumns">,
  scope: ItemListStructureScope,
) {
  if (scope.kind !== "groupedColumnCell") {
    return undefined;
  }

  return readGroupedColumnDisplayTo(editor, scope.columnIndex);
}

function applyGroupedColumnLabel(
  editor: Pick<
    UseEntityListLayoutEditorResult,
    "setExpandableColumns" | "expandableColumns"
  >,
  columnIndex: number,
  label: string,
): void {
  editor.setExpandableColumns(
    editor.expandableColumns.map((column, index) =>
      index === columnIndex
        ? { ...column, label: label.trim() || undefined }
        : column,
    ),
  );
}

export function readGroupedColumnLabelBaseline(
  editor: Pick<UseEntityListLayoutEditorResult, "expandableColumns">,
  scope: ItemListStructureScope,
): string | undefined {
  if (scope.kind !== "groupedColumnCell") {
    return undefined;
  }

  return readGroupedColumnLabel(editor, scope.columnIndex);
}

export function applyPanelSessionSnapshot(
  editor: Pick<
    UseEntityListLayoutEditorResult,
    | "setLayout"
    | "setRowExpandLayout"
    | "setExpandableColumns"
    | "expandableColumns"
  >,
  session: Pick<
    ItemListPanelSession,
    "baseline" | "structureScope" | "groupedColumnLabelBaseline"
  >,
): void {
  applyScopeLayoutSnapshot(editor, session.baseline, session.structureScope);

  if (
    session.structureScope.kind === "groupedColumnCell" &&
    session.groupedColumnLabelBaseline !== undefined
  ) {
    applyGroupedColumnLabel(
      editor,
      session.structureScope.columnIndex,
      session.groupedColumnLabelBaseline,
    );
  }
}

export function resolveScopeLayoutBinding(
  editor: Pick<
    UseEntityListLayoutEditorResult,
    | "layout"
    | "setLayout"
    | "rowExpandLayout"
    | "setRowExpandLayout"
    | "expandableColumns"
    | "setExpandableColumns"
  >,
  scope: ItemListStructureScope,
): ComponentsLayoutBinding {
  if (scope.kind === "listItem") {
    return createComponentsLayoutBinding(editor.layout, editor.setLayout);
  }

  if (scope.kind === "expandableRow") {
    return createComponentsLayoutBinding(
      editor.rowExpandLayout,
      editor.setRowExpandLayout,
    );
  }

  const column = editor.expandableColumns[scope.columnIndex];
  const cellLayout = column?.cellLayout ?? editor.rowExpandLayout;

  return createComponentsLayoutBinding(cellLayout, (nextLayout) => {
    editor.setExpandableColumns(
      editor.expandableColumns.map((entry, index) =>
        index === scope.columnIndex
          ? { ...entry, cellLayout: nextLayout }
          : entry,
      ),
    );
  });
}
