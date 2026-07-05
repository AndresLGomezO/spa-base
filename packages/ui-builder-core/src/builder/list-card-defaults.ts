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

export function createDefaultListCardLayout(
  fieldPaths: readonly string[],
): UiLayoutDocument {
  const primaryFields = fieldPaths.slice(0, 4);
  const primaryField = fieldPaths[0] ?? "name";

  const { layout: beganLayout, containerLocator } = beginContainerRootLayout();
  const { layout: withGrid, rowId: gridRowId } = insertGridRowAt(
    beganLayout,
    containerLocator,
    { position: "after" },
    {
      trackCount: 2,
      gridTemplateColumns: "minmax(0, 2fr) minmax(0, 1fr)",
    },
  );

  const [leftLocator, rightLocator] = resolveGridTrackLocators(
    withGrid,
    containerLocator,
    gridRowId,
  );
  if (!leftLocator || !rightLocator) {
    return { ...withGrid, showActions: true };
  }

  let layout = withGrid;
  for (const fieldPath of primaryFields) {
    layout = addComponentRowAt(layout, leftLocator, {
      kind: "text",
      primary: { type: "field", path: fieldPath },
      label: { show: true },
    });
  }

  layout = addComponentRowAt(layout, rightLocator, {
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
