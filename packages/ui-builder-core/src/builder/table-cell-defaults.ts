import type { UiLayoutDocument } from "../types/layout.js";
import { createLayoutId } from "./id.js";
import { createEmptyLayout } from "./mutations.js";

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

  const column = layout.root.columns[0];
  if (!column) {
    return layout;
  }

  return {
    ...layout,
    root: {
      ...layout.root,
      columns: [{ ...column, rows }],
    },
  };
}
