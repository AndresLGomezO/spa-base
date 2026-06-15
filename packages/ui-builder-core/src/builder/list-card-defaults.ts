import type { UiLayoutDocument } from "../types/layout.js";
import { addComponentRowAt, insertNestedLayoutRowAt } from "./mutations.js";
import {
  beginContainerRootLayout,
  ensureContainerRoot,
  resolveRootContainer,
} from "../layout/ensure-container-root.js";

export function createDefaultListCardLayout(
  fieldPaths: readonly string[],
): UiLayoutDocument {
  const primaryFields = fieldPaths.slice(0, 4);
  const primaryField = fieldPaths[0] ?? "name";

  const { layout: beganLayout, containerLocator } = beginContainerRootLayout();
  let layout = beganLayout;
  const { layout: withNested, rowId: nestedRowId } = insertNestedLayoutRowAt(
    layout,
    containerLocator,
    { position: "after" },
    2,
  );
  layout = withNested;

  const nestedLocator = (nestedColumnIndex: number) => ({
    scope: "nested" as const,
    columnIndex: containerLocator.columnIndex,
    containerRowId: containerLocator.containerRowId,
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

export function isListCardContainerRootLayout(
  layout: UiLayoutDocument,
): boolean {
  return resolveRootContainer(layout) != null;
}

export function ensureListCardContainerRootLayout(
  layout: UiLayoutDocument,
  fieldPaths: readonly string[],
): UiLayoutDocument {
  const normalized = ensureContainerRoot(layout);
  if (isListCardContainerRootLayout(normalized)) {
    return normalized;
  }

  return createDefaultListCardLayout(fieldPaths);
}

// Back-compat aliases during migration
export const isListCardNestedRootLayout = isListCardContainerRootLayout;
export const ensureListCardNestedRootLayout = ensureListCardContainerRootLayout;
