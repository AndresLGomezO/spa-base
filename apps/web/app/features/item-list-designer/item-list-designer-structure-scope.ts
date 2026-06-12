import type { DesignSurface } from "@repo/ui-builder-core";

import type { ComponentColumnRef } from "../form-designer/form-designer-component-column-ref";
import type { ComponentRowRef } from "../form-designer/form-designer-component-row-ref";

export type ItemListColumnsScope = "grouped" | "expanded";

export type ItemListStructureScope =
  | { readonly kind: "listItem" }
  | { readonly kind: "expandableRow" }
  | { readonly kind: "groupedColumnCell"; readonly columnIndex: number };

export type ItemListPanelTarget =
  | { readonly kind: "groupedColumn"; readonly columnIndex: number }
  | { readonly kind: "row"; readonly rowRef: ComponentRowRef }
  | { readonly kind: "column"; readonly columnRef: ComponentColumnRef };

export function resolveDesignSurfaceForScope(
  scope: ItemListStructureScope,
): DesignSurface {
  if (scope.kind === "listItem") {
    return "listItem";
  }

  return scope.kind === "expandableRow" ? "tableRowExpand" : "tableColumnCell";
}

export function areItemListPanelTargetsEqual(
  left: ItemListPanelTarget,
  right: ItemListPanelTarget,
): boolean {
  if (left.kind !== right.kind) {
    return false;
  }

  if (left.kind === "groupedColumn" && right.kind === "groupedColumn") {
    return left.columnIndex === right.columnIndex;
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
