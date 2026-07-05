import type { UiLayoutDocument } from "../types/layout.js";
import { createLayoutId } from "./id.js";
import {
  addComponentRowAt,
  insertGridRowAt,
  resolveGridTrackLocators,
} from "./mutations.js";
import {
  beginContainerRootLayout,
  ensureContainerRoot,
} from "../layout/ensure-container-root.js";

export function createDefaultUiLayout(
  fieldPaths: readonly string[],
): UiLayoutDocument {
  const primaryFields = fieldPaths.slice(0, 4);
  const primaryField = fieldPaths[0] ?? "name";

  const { layout: beganLayout, containerLocator } = beginContainerRootLayout();
  const { layout: withGrid, rowId: gridRowId } = insertGridRowAt(
    beganLayout,
    containerLocator,
    { position: "after" },
    { trackCount: 2 },
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

export function createAccountCardSeedLayout(): UiLayoutDocument {
  return ensureContainerRoot({
    showActions: true,
    root: {
      type: "root",
      id: createLayoutId("root"),
      columnCount: 3,
      columns: [
        {
          id: createLayoutId("col"),
          rows: [
            {
              type: "component",
              id: createLayoutId("row"),
              component: {
                kind: "image",
                primary: { type: "field", path: "bankId.logo" },
                styles: [
                  { property: "alignItems", value: "center" },
                  { property: "justifyContent", value: "center" },
                ],
              },
            },
          ],
        },
        {
          id: createLayoutId("col"),
          rows: [
            {
              type: "component",
              id: createLayoutId("row"),
              component: {
                kind: "text",
                primary: { type: "field", path: "name" },
                styles: [{ property: "fontSize", value: "16" }],
              },
            },
            {
              type: "component",
              id: createLayoutId("row"),
              component: {
                kind: "text",
                primary: { type: "field", path: "accountTypeId" },
                styles: [{ property: "color", value: "muted" }],
              },
            },
            {
              type: "component",
              id: createLayoutId("row"),
              component: {
                kind: "text",
                primary: { type: "field", path: "currencyId" },
                label: { show: true, text: "Currency" },
              },
            },
            {
              type: "component",
              id: createLayoutId("row"),
              component: {
                kind: "text",
                primary: { type: "field", path: "balance" },
                label: { show: true, text: "Balance" },
              },
            },
          ],
        },
        {
          id: createLayoutId("col"),
          styles: [{ property: "alignItems", value: "end" }],
          rows: [
            {
              type: "component",
              id: createLayoutId("row"),
              component: {
                kind: "numeric",
                primary: { type: "field", path: "balance" },
                displayFormat: "plain",
              },
            },
            {
              type: "component",
              id: createLayoutId("row"),
              component: {
                kind: "text",
                primary: { type: "field", path: "createdAt" },
                label: { show: true, text: "Created" },
              },
            },
            {
              type: "component",
              id: createLayoutId("row"),
              component: {
                kind: "text",
                primary: { type: "field", path: "updatedAt" },
                label: { show: true, text: "Updated" },
              },
            },
          ],
        },
      ],
    },
  });
}
