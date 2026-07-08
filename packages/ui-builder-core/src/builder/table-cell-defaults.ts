import type { UiLayoutDocument } from "../types/layout.js";
import { createLayoutId } from "./id.js";
import { createEmptyLayout } from "./mutations.js";
import { ensureContainerRoot } from "../layout/ensure-container-root.js";
import {
  asEditableLayoutRoot,
  resolveLayoutRootColumns,
} from "../layout/layout-root-adapters.js";

export interface DefaultTableCellLayoutOptions {
  readonly showLabel?: boolean;
}

export function createDefaultTableCellLayout(
  fieldPaths: readonly string[],
  options: DefaultTableCellLayoutOptions = {},
): UiLayoutDocument {
  const showLabel = options.showLabel ?? false;
  const layout = createEmptyLayout(1);
  const rows = fieldPaths.map((fieldPath) => ({
    type: "component" as const,
    id: createLayoutId("row"),
    component: {
      kind: "text" as const,
      primary: { type: "field" as const, path: fieldPath },
      label: { show: showLabel },
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

export function createEmptyTableCellLayout(): UiLayoutDocument {
  return ensureContainerRoot(createEmptyLayout(1));
}
