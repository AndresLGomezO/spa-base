import type { UiLayoutDocument } from "../types/layout.js";
import { createLayoutId } from "./id.js";
import { createEmptyLayout } from "./mutations.js";

export function createDefaultUiLayout(
  fieldPaths: readonly string[],
): UiLayoutDocument {
  const primaryFields = fieldPaths.slice(0, 4);
  const layout = createEmptyLayout(2);

  const infoRows = primaryFields.map((fieldPath) => ({
    type: "component" as const,
    id: createLayoutId("row"),
    component: {
      kind: "text" as const,
      primary: { type: "field" as const, path: fieldPath },
      label: { show: true },
    },
  }));

  const primaryField = fieldPaths[0] ?? "name";
  const highlightRow = {
    type: "component" as const,
    id: createLayoutId("row"),
    component: {
      kind: "text" as const,
      primary: { type: "field" as const, path: primaryField },
      styles: [{ property: "fontWeight" as const, value: "bold" }],
    },
  };

  const columns = [...layout.root.columns];
  const left = columns[0];
  const right = columns[1];
  if (left && right) {
    columns[0] = { ...left, rows: infoRows };
    columns[1] = { ...right, rows: [highlightRow] };
  }

  return {
    ...layout,
    showActions: true,
    root: { ...layout.root, columns },
  };
}

export function createAccountCardSeedLayout(): UiLayoutDocument {
  return {
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
  };
}
