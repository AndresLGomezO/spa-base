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

export interface DefaultRecordDetailFieldMeta {
  readonly type: string;
}

function preferredImageFieldNames(
  fields: Readonly<Record<string, DefaultRecordDetailFieldMeta>>,
): string[] {
  const imageFields = Object.entries(fields)
    .filter(([, meta]) => meta.type === "image")
    .map(([name]) => name);
  const preferred = ["logo", "image"].filter((name) =>
    imageFields.includes(name),
  );
  const rest = imageFields.filter((name) => !preferred.includes(name));
  return [...preferred, ...rest];
}

function preferredTextFieldNames(
  fields: Readonly<Record<string, DefaultRecordDetailFieldMeta>>,
): string[] {
  const textish = Object.entries(fields)
    .filter(
      ([, meta]) =>
        meta.type !== "image" &&
        meta.type !== "document" &&
        meta.type !== "relation",
    )
    .map(([name]) => name);
  const preferred = ["name", "title", "label", "description"].filter((name) =>
    textish.includes(name),
  );
  const rest = textish.filter((name) => !preferred.includes(name));
  return [...preferred, ...rest];
}

function preferredDocumentFieldNames(
  fields: Readonly<Record<string, DefaultRecordDetailFieldMeta>>,
): string[] {
  const documentFields = Object.entries(fields)
    .filter(([, meta]) => meta.type === "document")
    .map(([name]) => name);
  const preferred = ["file", "document", "attachment"].filter((name) =>
    documentFields.includes(name),
  );
  const rest = documentFields.filter((name) => !preferred.includes(name));
  return [...preferred, ...rest];
}

/**
 * Default record-detail layout: image(s) on the left, primary text on the right,
 * plus document fields as labeled text slots (rendered as download links at runtime).
 */
export function createDefaultRecordDetailLayout(
  fields: Readonly<Record<string, DefaultRecordDetailFieldMeta>>,
): UiLayoutDocument {
  const imageFields = preferredImageFieldNames(fields).slice(0, 2);
  const textFields = preferredTextFieldNames(fields).slice(0, 4);
  const documentFields = preferredDocumentFieldNames(fields).slice(0, 2);
  const primaryText = textFields[0] ?? Object.keys(fields)[0] ?? "name";

  if (imageFields.length === 0 && documentFields.length === 0) {
    const paths = textFields.length > 0 ? textFields : [primaryText];
    return createDefaultUiLayout(paths);
  }

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

  for (const fieldPath of imageFields) {
    layout = addComponentRowAt(layout, leftLocator, {
      kind: "image",
      primary: { type: "field", path: fieldPath },
      styles: [
        { property: "alignItems", value: "center" },
        { property: "justifyContent", value: "center" },
      ],
    });
  }

  if (imageFields.length === 0) {
    for (const fieldPath of textFields.slice(0, 2)) {
      layout = addComponentRowAt(layout, leftLocator, {
        kind: "text",
        primary: { type: "field", path: fieldPath },
        label: { show: true },
      });
    }
  }

  layout = addComponentRowAt(layout, rightLocator, {
    kind: "text",
    primary: { type: "field", path: primaryText },
    styles: [{ property: "fontWeight", value: "bold" }],
  });

  for (const fieldPath of textFields.slice(1)) {
    layout = addComponentRowAt(layout, rightLocator, {
      kind: "text",
      primary: { type: "field", path: fieldPath },
      label: { show: true },
    });
  }

  for (const fieldPath of documentFields) {
    layout = addComponentRowAt(layout, rightLocator, {
      kind: "text",
      primary: { type: "field", path: fieldPath },
      label: { show: true },
    });
  }

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
