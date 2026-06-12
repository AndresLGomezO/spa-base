import type { UiLayoutDocument } from "../types/layout.js";
import {
  addComponentRowAt,
  createEmptyLayout,
  insertNestedLayoutRowAt,
} from "./mutations.js";

export function createDefaultListCardLayout(
  fieldPaths: readonly string[],
): UiLayoutDocument {
  const primaryFields = fieldPaths.slice(0, 4);
  const primaryField = fieldPaths[0] ?? "name";

  let layout = createEmptyLayout(1);
  const rootColumnIndex = 0;
  const { layout: withNested, rowId: nestedRowId } = insertNestedLayoutRowAt(
    layout,
    { scope: "root", columnIndex: rootColumnIndex },
    { position: "after" },
    2,
  );
  layout = withNested;

  const nestedLocator = (nestedColumnIndex: number) => ({
    scope: "nested" as const,
    columnIndex: rootColumnIndex,
    rowId: nestedRowId,
    nestedColumnIndex,
  });

  for (const fieldPath of primaryFields) {
    layout = addComponentRowAt(layout, nestedLocator(0), {
      kind: "text",
      primary: { type: "field", path: fieldPath },
      label: { show: true },
    });
  }

  layout = addComponentRowAt(layout, nestedLocator(1), {
    kind: "text",
    primary: { type: "field", path: primaryField },
    styles: [{ property: "fontWeight", value: "bold" }],
  });

  return {
    ...layout,
    showActions: true,
  };
}

export function isListCardNestedRootLayout(layout: UiLayoutDocument): boolean {
  const rootColumn = layout.root.columns[0];
  if (!rootColumn || rootColumn.rows.length !== 1) {
    return false;
  }

  const row = rootColumn.rows[0];
  return row?.type === "nested-layout";
}

export function ensureListCardNestedRootLayout(
  layout: UiLayoutDocument,
  fieldPaths: readonly string[],
): UiLayoutDocument {
  if (isListCardNestedRootLayout(layout)) {
    return layout;
  }

  return createDefaultListCardLayout(fieldPaths);
}
