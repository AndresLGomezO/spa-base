import type { GroupedTableColumn, UiLayoutDocument } from "@repo/entities";

import { areScopedLayoutSnapshotsEqual } from "../form-designer/form-designer-components-layout";
import type { UseEntityListLayoutEditorResult } from "../ui-builder/use-entity-list-layout-editor";
import { resolveListLayoutPresetId } from "../ui-builder/use-entity-list-layout-editor";
import type { LayoutPresetId } from "../ui-builder/use-layout-system-preset-catalog";

type ListPresentationType = "table" | "card" | "expandableTable";

export function viewTypeFromLayoutPresetId(
  layoutPresetId: LayoutPresetId,
): ListPresentationType {
  if (layoutPresetId === "card-list") {
    return "card";
  }
  if (layoutPresetId === "expandable-table-list") {
    return "expandableTable";
  }
  return "table";
}

export interface ItemListDesignerSettingsSnapshot {
  readonly layoutPresetId: LayoutPresetId;
}

export interface ItemListDesignerTableColumnsSnapshot {
  readonly tableFields: readonly string[];
  readonly tableShowActions: boolean;
}

export interface ItemListDesignerExpandableColumnsSnapshot {
  readonly expandableColumns: readonly GroupedTableColumn[];
  readonly expandableShowActions: boolean;
  readonly rowExpandLayout: UiLayoutDocument;
}

export type ItemListDesignerColumnsSnapshot =
  | {
      readonly kind: "table";
      readonly data: ItemListDesignerTableColumnsSnapshot;
    }
  | {
      readonly kind: "expandableTable";
      readonly data: ItemListDesignerExpandableColumnsSnapshot;
    };

export interface ItemListDesignerCardLayoutSnapshot {
  readonly layout: UiLayoutDocument;
}

export type ItemListDesignerLayoutSnapshot = {
  readonly kind: "card";
  readonly data: ItemListDesignerCardLayoutSnapshot;
};

function readTableViewFromDefinition(
  definition: UseEntityListLayoutEditorResult["definition"],
  fieldPaths: readonly string[],
): ItemListDesignerTableColumnsSnapshot {
  const tableView = definition.ui.views.find((view) => view.type === "table");
  const fields =
    tableView && tableView.fields.length > 0
      ? [...tableView.fields]
      : fieldPaths;

  return {
    tableFields: fields,
    tableShowActions:
      tableView?.type === "table" ? tableView.showActions !== false : true,
  };
}

function readExpandableViewFromDefinition(
  definition: UseEntityListLayoutEditorResult["definition"],
  fieldPaths: readonly string[],
  editor: Pick<
    UseEntityListLayoutEditorResult,
    "expandableColumns" | "rowExpandLayout" | "expandableShowActions"
  >,
): ItemListDesignerExpandableColumnsSnapshot {
  const expandableView = definition.ui.views.find(
    (view) => view.type === "expandableTable",
  );

  return {
    expandableColumns:
      expandableView?.type === "expandableTable"
        ? [...expandableView.columns]
        : [...editor.expandableColumns],
    expandableShowActions:
      expandableView?.type === "expandableTable"
        ? expandableView.showActions !== false
        : editor.expandableShowActions,
    rowExpandLayout:
      expandableView?.type === "expandableTable"
        ? expandableView.rowExpandLayout
        : editor.rowExpandLayout,
  };
}

export function readSettingsSnapshot(
  editor: Pick<UseEntityListLayoutEditorResult, "layoutPresetId">,
): ItemListDesignerSettingsSnapshot {
  return { layoutPresetId: editor.layoutPresetId };
}

export function readSettingsSnapshotFromDefinition(
  definition: UseEntityListLayoutEditorResult["definition"],
  editor: Pick<UseEntityListLayoutEditorResult, "layout" | "layoutPresetId">,
): ItemListDesignerSettingsSnapshot {
  const listItem =
    definition.ui.listItem ??
    definition.ui.views.find((view) => view.type === "card")?.layout;
  return {
    layoutPresetId: listItem
      ? resolveListLayoutPresetId(listItem, definition.ui.listViewType)
      : editor.layoutPresetId,
  };
}

export function areSettingsSnapshotsEqual(
  left: ItemListDesignerSettingsSnapshot,
  right: ItemListDesignerSettingsSnapshot,
): boolean {
  return left.layoutPresetId === right.layoutPresetId;
}

function readTableColumnsSnapshot(
  editor: Pick<
    UseEntityListLayoutEditorResult,
    "tableFields" | "tableShowActions"
  >,
): ItemListDesignerTableColumnsSnapshot {
  return {
    tableFields: [...editor.tableFields],
    tableShowActions: editor.tableShowActions,
  };
}

function readExpandableColumnsSnapshot(
  editor: Pick<
    UseEntityListLayoutEditorResult,
    "expandableColumns" | "expandableShowActions" | "rowExpandLayout"
  >,
): ItemListDesignerExpandableColumnsSnapshot {
  return {
    expandableColumns: [...editor.expandableColumns],
    expandableShowActions: editor.expandableShowActions,
    rowExpandLayout: editor.rowExpandLayout,
  };
}

export function readColumnsSnapshot(
  editor: UseEntityListLayoutEditorResult,
): ItemListDesignerColumnsSnapshot {
  if (editor.viewType === "expandableTable") {
    return {
      kind: "expandableTable",
      data: readExpandableColumnsSnapshot(editor),
    };
  }

  return {
    kind: "table",
    data: readTableColumnsSnapshot(editor),
  };
}

export function readColumnsSnapshotFromDefinition(
  definition: UseEntityListLayoutEditorResult["definition"],
  fieldPaths: readonly string[],
  editor: Pick<
    UseEntityListLayoutEditorResult,
    "expandableColumns" | "rowExpandLayout" | "expandableShowActions"
  >,
  viewType: ListPresentationType,
): ItemListDesignerColumnsSnapshot {
  if (viewType === "expandableTable") {
    return {
      kind: "expandableTable",
      data: readExpandableViewFromDefinition(definition, fieldPaths, editor),
    };
  }

  return {
    kind: "table",
    data: readTableViewFromDefinition(definition, fieldPaths),
  };
}

function areGroupedColumnsEqual(
  left: readonly GroupedTableColumn[],
  right: readonly GroupedTableColumn[],
): boolean {
  if (left.length !== right.length) {
    return false;
  }

  return left.every((column, index) => {
    const other = right[index];
    if (!other) {
      return false;
    }

    return (
      column.id === other.id &&
      column.label === other.label &&
      column.displayFrom === other.displayFrom &&
      column.displayTo === other.displayTo &&
      areScopedLayoutSnapshotsEqual(column.cellLayout, other.cellLayout)
    );
  });
}

export function areColumnsSnapshotsEqual(
  left: ItemListDesignerColumnsSnapshot,
  right: ItemListDesignerColumnsSnapshot,
): boolean {
  if (left.kind !== right.kind) {
    return false;
  }

  if (left.kind === "table" && right.kind === "table") {
    return (
      left.data.tableShowActions === right.data.tableShowActions &&
      left.data.tableFields.length === right.data.tableFields.length &&
      left.data.tableFields.every(
        (field, index) => field === right.data.tableFields[index],
      )
    );
  }

  if (left.kind === "expandableTable" && right.kind === "expandableTable") {
    return (
      left.data.expandableShowActions === right.data.expandableShowActions &&
      areGroupedColumnsEqual(
        left.data.expandableColumns,
        right.data.expandableColumns,
      ) &&
      areScopedLayoutSnapshotsEqual(
        left.data.rowExpandLayout,
        right.data.rowExpandLayout,
      )
    );
  }

  return false;
}

export function applySettingsSnapshotToEditor(
  editor: Pick<UseEntityListLayoutEditorResult, "applyListSystemPreset">,
  snapshot: ItemListDesignerSettingsSnapshot,
): void {
  const presetId = snapshot.layoutPresetId;
  if (
    presetId === "plain-table-list" ||
    presetId === "card-list" ||
    presetId === "expandable-table-list"
  ) {
    editor.applyListSystemPreset({ source: "builtin", id: presetId });
  }
}

export function applyColumnsSnapshotToEditor(
  editor: Pick<
    UseEntityListLayoutEditorResult,
    | "setTableFields"
    | "setTableShowActions"
    | "setExpandableColumns"
    | "setExpandableShowActions"
    | "setRowExpandLayout"
  >,
  snapshot: ItemListDesignerColumnsSnapshot,
): void {
  if (snapshot.kind === "table") {
    editor.setTableFields([...snapshot.data.tableFields]);
    editor.setTableShowActions(snapshot.data.tableShowActions);
    return;
  }

  editor.setExpandableColumns([...snapshot.data.expandableColumns]);
  editor.setExpandableShowActions(snapshot.data.expandableShowActions);
  editor.setRowExpandLayout(snapshot.data.rowExpandLayout);
}

function readCardLayoutFromDefinition(
  definition: UseEntityListLayoutEditorResult["definition"],
  editor: Pick<UseEntityListLayoutEditorResult, "layout">,
): ItemListDesignerCardLayoutSnapshot {
  const cardView = definition.ui.views.find((view) => view.type === "card");
  const listItem =
    definition.ui.listItem ??
    (cardView?.type === "card" ? cardView.layout : undefined);

  return {
    layout: structuredClone(listItem ?? editor.layout),
  };
}

function readCardLayoutSnapshot(
  editor: Pick<UseEntityListLayoutEditorResult, "layout">,
): ItemListDesignerCardLayoutSnapshot {
  return {
    layout: structuredClone(editor.layout),
  };
}

export function readLayoutSnapshot(
  editor: UseEntityListLayoutEditorResult,
): ItemListDesignerLayoutSnapshot {
  return {
    kind: "card",
    data: readCardLayoutSnapshot(editor),
  };
}

export function readLayoutSnapshotFromDefinition(
  definition: UseEntityListLayoutEditorResult["definition"],
  editor: Pick<UseEntityListLayoutEditorResult, "layout">,
): ItemListDesignerLayoutSnapshot {
  return {
    kind: "card",
    data: readCardLayoutFromDefinition(definition, editor),
  };
}

export function areLayoutSnapshotsEqual(
  left: ItemListDesignerLayoutSnapshot,
  right: ItemListDesignerLayoutSnapshot,
): boolean {
  if (left.kind !== right.kind) {
    return false;
  }

  return areScopedLayoutSnapshotsEqual(left.data.layout, right.data.layout);
}

export function applyLayoutSnapshotToEditor(
  editor: Pick<UseEntityListLayoutEditorResult, "setLayout">,
  snapshot: ItemListDesignerLayoutSnapshot,
): void {
  editor.setLayout(structuredClone(snapshot.data.layout));
}
