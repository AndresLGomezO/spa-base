import type { ComponentClickAction } from "../types/click-action.js";
import type { ComponentRowNode, UiLayoutDocument } from "../types/layout.js";
import { createLayoutId } from "./id.js";
import {
  insertGridRowAt,
  insertRowAt,
  resolveGridTrackLocators,
} from "./mutations.js";
import {
  beginContainerRootLayout,
  ensureContainerRoot,
  resolveRootContainer,
} from "../layout/ensure-container-root.js";

const EXPAND_COLUMN_COUNT = 3;

export interface DefaultRowExpandLayoutOptions {
  readonly showLabel?: boolean;
}

function relationClickAction(fieldPath: string): ComponentClickAction {
  return {
    type: "entityRecord",
    target: { relationFieldPath: fieldPath },
  };
}

function createExpandFieldRow(
  fieldPath: string,
  relationKind?: string,
  showLabel = true,
): ComponentRowNode {
  const isRelation =
    relationKind === "many-to-one" || relationKind === "one-to-one";

  return {
    type: "component",
    id: createLayoutId("row"),
    component: {
      kind: "text",
      primary: { type: "field", path: fieldPath },
      label: { show: showLabel },
    },
    ...(isRelation ? { clickAction: relationClickAction(fieldPath) } : {}),
  };
}

function insertExpandFieldRowAt(
  layout: UiLayoutDocument,
  locator: Parameters<typeof insertRowAt>[1],
  fieldPath: string,
  relationKind?: string,
  showLabel = true,
): UiLayoutDocument {
  const row = createExpandFieldRow(fieldPath, relationKind, showLabel);
  return insertRowAt(layout, locator, { position: "after" }, row);
}

export function createDefaultRowExpandLayout(
  fieldPaths: readonly string[],
  fieldRelations?: Readonly<
    Record<string, { readonly type?: string } | undefined>
  >,
  options: DefaultRowExpandLayoutOptions = {},
): UiLayoutDocument {
  const showLabel = options.showLabel ?? true;
  if (fieldPaths.length === 0) {
    return createEmptyRowExpandLayout();
  }

  const { layout: beganLayout, containerLocator } = beginContainerRootLayout();
  const { layout: withGrid, rowId: gridRowId } = insertGridRowAt(
    beganLayout,
    containerLocator,
    { position: "after" },
    { trackCount: EXPAND_COLUMN_COUNT },
  );

  const trackLocators = resolveGridTrackLocators(
    withGrid,
    containerLocator,
    gridRowId,
  );
  if (trackLocators.length === 0) {
    return withGrid;
  }

  let layout = withGrid;
  fieldPaths.forEach((fieldPath, index) => {
    const trackLocator = trackLocators[index % EXPAND_COLUMN_COUNT];
    if (!trackLocator) {
      return;
    }
    layout = insertExpandFieldRowAt(
      layout,
      trackLocator,
      fieldPath,
      fieldRelations?.[fieldPath]?.type,
      showLabel,
    );
  });

  return { ...layout, showActions: undefined };
}

export function createEmptyRowExpandLayout(): UiLayoutDocument {
  const { layout } = beginContainerRootLayout();
  return { ...layout, showActions: undefined };
}

export function isRowExpandContainerRootLayout(
  layout: UiLayoutDocument,
): boolean {
  return resolveRootContainer(layout) != null;
}

export function ensureRowExpandContainerRootLayout(
  layout: UiLayoutDocument,
  fieldPaths: readonly string[],
  fieldRelations?: Readonly<
    Record<string, { readonly type?: string } | undefined>
  >,
): UiLayoutDocument {
  const normalized = ensureContainerRoot(layout);
  if (isRowExpandContainerRootLayout(normalized)) {
    return normalized;
  }

  return createDefaultRowExpandLayout(fieldPaths, fieldRelations);
}

export const isRowExpandNestedRootLayout = isRowExpandContainerRootLayout;
export const ensureRowExpandNestedRootLayout =
  ensureRowExpandContainerRootLayout;
