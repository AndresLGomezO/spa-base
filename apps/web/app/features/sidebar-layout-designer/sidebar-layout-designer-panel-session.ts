import type { UiLayoutDocument } from "@repo/entities";

import { areScopedLayoutSnapshotsEqual } from "../form-designer/form-designer-components-layout";
import type { ComponentColumnRef } from "../form-designer/form-designer-component-column-ref";
import { areComponentColumnRefsEqual } from "../form-designer/form-designer-component-column-ref";
import type { ComponentRowRef } from "../form-designer/form-designer-component-row-ref";
import { areComponentRowRefsEqual } from "../form-designer/form-designer-component-row-ref";

export type SidebarLayoutUnsavedReason = "structurePanel" | "tab";

export type SidebarLayoutPanelTarget =
  | { readonly kind: "row"; readonly rowRef: ComponentRowRef }
  | { readonly kind: "column"; readonly columnRef: ComponentColumnRef };

export type SidebarLayoutPanelPendingAction =
  | { readonly type: "close" }
  | {
      readonly type: "switch";
      readonly target: SidebarLayoutPanelTarget;
      readonly label: string;
    };

export interface SidebarLayoutPanelSession {
  readonly target: SidebarLayoutPanelTarget;
  readonly label: string;
  readonly baseline: UiLayoutDocument;
}

export function areSidebarLayoutPanelTargetsEqual(
  left: SidebarLayoutPanelTarget,
  right: SidebarLayoutPanelTarget,
): boolean {
  if (left.kind !== right.kind) {
    return false;
  }

  if (left.kind === "row" && right.kind === "row") {
    return areComponentRowRefsEqual(left.rowRef, right.rowRef);
  }

  if (left.kind === "column" && right.kind === "column") {
    return areComponentColumnRefsEqual(left.columnRef, right.columnRef);
  }

  return false;
}

export function isSidebarLayoutPanelSessionDirty(
  session: SidebarLayoutPanelSession,
  currentLayout: UiLayoutDocument,
): boolean {
  return !areScopedLayoutSnapshotsEqual(session.baseline, currentLayout);
}
