import type { UiLayoutDocument } from "@repo/entities";
import type { ResponsiveGridBreakpoint } from "@repo/ui-builder-core";

import { areScopedLayoutSnapshotsEqual } from "../form-designer/form-designer-components-layout";
import {
  areItemListPanelTargetsEqual,
  type ItemListPanelTarget,
  type ItemListStructureScope,
} from "./item-list-designer-structure-scope";

export type ItemListUnsavedReason = "tab" | "columnsScope" | "structurePanel";

export type ItemListPanelPendingAction =
  | { readonly type: "close" }
  | {
      readonly type: "switch";
      readonly target: ItemListPanelTarget;
      readonly label: string;
      readonly structureScope: ItemListStructureScope;
    };

export interface ItemListPanelSession {
  readonly target: ItemListPanelTarget;
  readonly label: string;
  readonly structureScope: ItemListStructureScope;
  readonly baseline: UiLayoutDocument;
  readonly groupedColumnLabelBaseline?: string;
  readonly groupedColumnDisplayFromBaseline?: ResponsiveGridBreakpoint;
  readonly groupedColumnDisplayToBaseline?: ResponsiveGridBreakpoint;
}

export { areItemListPanelTargetsEqual };

function isItemListPanelDirty(
  baseline: UiLayoutDocument,
  current: UiLayoutDocument,
): boolean {
  return !areScopedLayoutSnapshotsEqual(baseline, current);
}

export function isItemListPanelSessionDirty(
  session: ItemListPanelSession,
  currentLayout: UiLayoutDocument,
  currentGroupedColumnLabel?: string,
  currentGroupedColumnDisplayFrom?: ResponsiveGridBreakpoint,
  currentGroupedColumnDisplayTo?: ResponsiveGridBreakpoint,
): boolean {
  const layoutDirty = isItemListPanelDirty(session.baseline, currentLayout);

  if (session.structureScope.kind !== "groupedColumnCell") {
    return layoutDirty;
  }

  const labelBaseline = session.groupedColumnLabelBaseline ?? "";
  const labelDirty = (currentGroupedColumnLabel ?? "") !== labelBaseline;

  if (session.target.kind !== "groupedColumn") {
    return layoutDirty || labelDirty;
  }

  const displayFromDirty =
    (currentGroupedColumnDisplayFrom ?? undefined) !==
    (session.groupedColumnDisplayFromBaseline ?? undefined);
  const displayToDirty =
    (currentGroupedColumnDisplayTo ?? undefined) !==
    (session.groupedColumnDisplayToBaseline ?? undefined);

  return layoutDirty || labelDirty || displayFromDirty || displayToDirty;
}
