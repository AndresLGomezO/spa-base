import type { UiLayoutDocument } from "@repo/entities";

import { areScopedLayoutSnapshotsEqual } from "../form-designer/form-designer-components-layout";
import type { ComponentColumnRef } from "../form-designer/form-designer-component-column-ref";
import { areComponentColumnRefsEqual } from "../form-designer/form-designer-component-column-ref";
import type { ComponentRowRef } from "../form-designer/form-designer-component-row-ref";
import { areComponentRowRefsEqual } from "../form-designer/form-designer-component-row-ref";

export type MetricsRowUnsavedReason = "tab" | "structurePanel" | "widget";

export type MetricsRowPanelTarget =
  | { readonly kind: "row"; readonly rowRef: ComponentRowRef }
  | { readonly kind: "column"; readonly columnRef: ComponentColumnRef };

export type MetricsRowPanelPendingAction =
  | { readonly type: "close" }
  | {
      readonly type: "switch";
      readonly target: MetricsRowPanelTarget;
      readonly label: string;
    };

export interface MetricsRowPanelSession {
  readonly target: MetricsRowPanelTarget;
  readonly label: string;
  readonly baseline: UiLayoutDocument;
}

export function areMetricsRowPanelTargetsEqual(
  left: MetricsRowPanelTarget,
  right: MetricsRowPanelTarget,
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

export function isMetricsRowPanelSessionDirty(
  session: MetricsRowPanelSession,
  currentLayout: UiLayoutDocument,
): boolean {
  return !areScopedLayoutSnapshotsEqual(session.baseline, currentLayout);
}
