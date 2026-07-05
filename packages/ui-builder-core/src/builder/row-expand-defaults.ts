import type { UiLayoutDocument } from "../types/layout.js";
import {
  addComponentRowAt,
  insertGridRowAt,
  resolveGridTrackLocators,
} from "./mutations.js";
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
  const { layout: withGrid, rowId: gridRowId } = insertGridRowAt(
    beganLayout,
    containerLocator,
    { position: "after" },
    { trackCount: 1 },
  );

  const [trackLocator] = resolveGridTrackLocators(
    withGrid,
    containerLocator,
    gridRowId,
  );
  if (!trackLocator) {
    return withGrid;
  }

  let layout = withGrid;
  for (const fieldPath of expandFields) {
    layout = addComponentRowAt(layout, trackLocator, {
      kind: "text",
      primary: { type: "field", path: fieldPath },
      label: { show: true },
    });
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
