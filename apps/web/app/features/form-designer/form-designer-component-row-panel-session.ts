import type { UiLayoutDocument } from "@repo/ui-builder-core";

import type { ComponentColumnRef } from "./form-designer-component-column-ref";
import type { ComponentRowRef } from "./form-designer-component-row-ref";
import {
  areScopedLayoutSnapshotsEqual,
  type ComponentsTreeScope,
} from "./form-designer-components-layout";

export type ComponentPanelTarget =
  | { readonly kind: "row"; readonly rowRef: ComponentRowRef }
  | { readonly kind: "column"; readonly columnRef: ComponentColumnRef };

export type ComponentRowPanelPendingAction =
  | { readonly type: "close" }
  | {
      readonly type: "switch";
      readonly target: ComponentPanelTarget;
      readonly label: string;
      readonly treeScope: ComponentsTreeScope;
      readonly stepIndex: number;
    };

export interface ComponentRowPanelSession {
  readonly target: ComponentPanelTarget;
  readonly label: string;
  readonly treeScope: ComponentsTreeScope;
  readonly stepIndex: number;
  readonly baseline: UiLayoutDocument;
}

export function areComponentPanelTargetsEqual(
  left: ComponentPanelTarget,
  right: ComponentPanelTarget,
): boolean {
  if (left.kind !== right.kind) {
    return false;
  }

  if (left.kind === "row" && right.kind === "row") {
    return (
      left.rowRef.rowId === right.rowRef.rowId &&
      JSON.stringify(left.rowRef.locator) ===
        JSON.stringify(right.rowRef.locator)
    );
  }

  if (left.kind === "column" && right.kind === "column") {
    const leftRef = left.columnRef;
    const rightRef = right.columnRef;
    return (
      leftRef.rootColumnIndex === rightRef.rootColumnIndex &&
      leftRef.nestedParentRowId === rightRef.nestedParentRowId &&
      leftRef.nestedColumnIndex === rightRef.nestedColumnIndex
    );
  }

  return false;
}

export function isComponentRowPanelDirty(
  baseline: UiLayoutDocument,
  current: UiLayoutDocument,
): boolean {
  return !areScopedLayoutSnapshotsEqual(baseline, current);
}
