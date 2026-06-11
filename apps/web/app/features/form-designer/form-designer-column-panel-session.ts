import {
  areLayoutSnapshotsEqual,
  type FormDesignerLayoutSnapshot,
} from "./form-designer-layout";

export type ColumnPanelPendingAction =
  | { readonly type: "close" }
  | { readonly type: "switch"; readonly columnIndex: number };

export type FormDesignerUnsavedReason =
  | "tab"
  | "columnPanel"
  | "componentRowPanel";

export function isColumnPanelDirty(
  baseline: FormDesignerLayoutSnapshot,
  current: FormDesignerLayoutSnapshot,
): boolean {
  return !areLayoutSnapshotsEqual(baseline, current);
}
