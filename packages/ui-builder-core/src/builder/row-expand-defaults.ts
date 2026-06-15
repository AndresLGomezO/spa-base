import type { UiLayoutDocument } from "../types/layout.js";
import { addComponentRowAt, insertNestedLayoutRowAt } from "./mutations.js";
import {
  beginContainerRootLayout,
  ensureContainerRoot,
  resolveRootContainer,
} from "../layout/ensure-container-root.js";

export function createDefaultRowExpandLayout(
  fieldPaths: readonly string[],
): UiLayoutDocument {
  const primaryField = fieldPaths[0] ?? "name";
  const expandFields =
    fieldPaths.length > 1 ? fieldPaths.slice(1) : [primaryField];

  const { layout: beganLayout, containerLocator } = beginContainerRootLayout();
  let layout = beganLayout;
  const { layout: withNested, rowId: nestedRowId } = insertNestedLayoutRowAt(
    layout,
    containerLocator,
    { position: "after" },
    1,
  );
  layout = withNested;

  for (const fieldPath of expandFields) {
    layout = addComponentRowAt(
      layout,
      {
        scope: "nested",
        columnIndex: containerLocator.columnIndex,
        containerRowId: containerLocator.containerRowId,
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

export function isRowExpandContainerRootLayout(
  layout: UiLayoutDocument,
): boolean {
  return resolveRootContainer(layout) != null;
}

export function ensureRowExpandContainerRootLayout(
  layout: UiLayoutDocument,
  fieldPaths: readonly string[],
): UiLayoutDocument {
  const normalized = ensureContainerRoot(layout);
  if (isRowExpandContainerRootLayout(normalized)) {
    return normalized;
  }

  return createDefaultRowExpandLayout(fieldPaths);
}

export const isRowExpandNestedRootLayout = isRowExpandContainerRootLayout;
export const ensureRowExpandNestedRootLayout =
  ensureRowExpandContainerRootLayout;
