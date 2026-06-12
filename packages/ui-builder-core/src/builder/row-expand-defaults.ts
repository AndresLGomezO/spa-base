import type { UiLayoutDocument } from "../types/layout.js";
import {
  addComponentRowAt,
  createEmptyLayout,
  insertNestedLayoutRowAt,
} from "./mutations.js";

export function createDefaultRowExpandLayout(
  fieldPaths: readonly string[],
): UiLayoutDocument {
  const primaryField = fieldPaths[0] ?? "name";
  const expandFields =
    fieldPaths.length > 1 ? fieldPaths.slice(1) : [primaryField];

  let layout = createEmptyLayout(1);
  const rootColumnIndex = 0;
  const { layout: withNested, rowId: nestedRowId } = insertNestedLayoutRowAt(
    layout,
    { scope: "root", columnIndex: rootColumnIndex },
    { position: "after" },
    1,
  );
  layout = withNested;

  for (const fieldPath of expandFields) {
    layout = addComponentRowAt(
      layout,
      {
        scope: "nested",
        columnIndex: rootColumnIndex,
        rowId: nestedRowId,
        nestedColumnIndex: 0,
      },
      {
        kind: "text",
        primary: { type: "field", path: fieldPath },
        label: { show: true },
      },
    );
  }

  return layout;
}

export function isRowExpandNestedRootLayout(layout: UiLayoutDocument): boolean {
  const rootColumn = layout.root.columns[0];
  if (!rootColumn || rootColumn.rows.length !== 1) {
    return false;
  }

  const row = rootColumn.rows[0];
  return row?.type === "nested-layout";
}

export function ensureRowExpandNestedRootLayout(
  layout: UiLayoutDocument,
  fieldPaths: readonly string[],
): UiLayoutDocument {
  if (isRowExpandNestedRootLayout(layout)) {
    return layout;
  }

  return createDefaultRowExpandLayout(fieldPaths);
}
