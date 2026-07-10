import type { UiLayoutDocument } from "@repo/entities";
import {
  asEditableLayoutRoot,
  resolveLayoutRootColumns,
} from "@repo/ui-builder-core";

import type { ComponentColumnRef } from "../form-designer/form-designer-component-column-ref";
import type { ComponentRowRef } from "../form-designer/form-designer-component-row-ref";
import {
  findColumnByRef,
  findRowByRef,
} from "../form-designer/form-designer-components-layout";

export type StructurePanelLayoutTarget =
  | { readonly kind: "row"; readonly rowRef: ComponentRowRef }
  | { readonly kind: "column"; readonly columnRef: ComponentColumnRef }
  | { readonly kind: "groupedColumn"; readonly columnIndex: number }
  | { readonly kind: "rootLayoutColumn"; readonly columnIndex: number }
  | { readonly kind: "rootLayout" };

export function resolveStructurePanelTargetId(
  layout: UiLayoutDocument,
  target: StructurePanelLayoutTarget,
  options?: {
    readonly groupedColumnIds?: readonly { readonly id: string }[];
  },
): string | undefined {
  switch (target.kind) {
    case "row":
      return findRowByRef(layout, target.rowRef)?.id;
    case "column":
      return findColumnByRef(layout, target.columnRef)?.column.id;
    case "groupedColumn":
      return options?.groupedColumnIds?.[target.columnIndex]?.id;
    case "rootLayoutColumn":
      return resolveLayoutRootColumns(layout)[target.columnIndex]?.id;
    case "rootLayout":
      return asEditableLayoutRoot(layout.root).id;
  }
}
