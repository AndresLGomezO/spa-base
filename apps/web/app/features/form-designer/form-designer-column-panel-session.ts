import {
  areLayoutSnapshotsEqual,
  type FormDesignerLayoutSnapshot,
} from "./form-designer-layout";

export type ColumnPanelPendingAction =
  | { readonly type: "close" }
  | { readonly type: "switch"; readonly columnIndex: number }
  | { readonly type: "openRootLayout" };

export type RootLayoutPanelPendingAction =
  | { readonly type: "close" }
  | { readonly type: "openColumn"; readonly columnIndex: number };

export interface RootLayoutPanelSession {
  readonly baseline: FormDesignerLayoutSnapshot;
}

export type FormDesignerUnsavedReason =
  | "tab"
  | "columnPanel"
  | "rootLayoutPanel"
  | "componentRowPanel";

export function isColumnPanelDirty(
  baseline: FormDesignerLayoutSnapshot,
  current: FormDesignerLayoutSnapshot,
): boolean {
  return !areLayoutSnapshotsEqual(baseline, current);
}
