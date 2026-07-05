import type { UiLayoutDocument } from "../types/layout.js";
import { createLayoutId } from "./id.js";
import { createEmptyLayout } from "./mutations.js";
import { ensureContainerRoot } from "../layout/ensure-container-root.js";
import {
  asEditableLayoutRoot,
  resolveLayoutRootColumns,
} from "../layout/layout-root-adapters.js";

export function createDefaultTableCellLayout(
  fieldPaths: readonly string[],
): UiLayoutDocument {
  const layout = createEmptyLayout(1);
  const rows = fieldPaths.map((fieldPath) => ({
    type: "component" as const,
    id: createLayoutId("row"),
    component: {
      kind: "text" as const,
      primary: { type: "field" as const, path: fieldPath },
      label: { show: true },
    },
  }));

  const column = resolveLayoutRootColumns(layout)[0];
  if (!column) {
    return ensureContainerRoot(layout);
  }

  return ensureContainerRoot({
    ...layout,
    root: {
      ...asEditableLayoutRoot(layout.root),
      columns: [{ ...column, rows }],
    },
  });
}
