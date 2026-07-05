/**
 * Converts between screen-root and legacy column-root for editing/mutations.
 */
import { createLayoutId } from "../builder/id.js";
import type {
  LayoutRootNode,
  ScreenRootNode,
  UiLayoutDocument,
} from "../types/layout.js";
import { isLayoutRootNode } from "../types/layout.js";
import { layoutRootToScreenRoot } from "./migrate-to-grid.js";

export function asEditableLayoutRoot(
  root: LayoutRootNode | ScreenRootNode,
): LayoutRootNode {
  if (isLayoutRootNode(root)) {
    return root;
  }

  return {
    type: "root",
    id: root.id,
    columnCount: 1,
    columns: [
      {
        id: createLayoutId("col"),
        rows: [...root.rows],
        styles: root.styles,
      },
    ],
    styles: root.styles,
  };
}

export function toEditableLayoutRoot(layout: UiLayoutDocument): LayoutRootNode {
  return asEditableLayoutRoot(layout.root);
}

export function toEditableLayoutDocument(
  layout: UiLayoutDocument,
): UiLayoutDocument {
  if (isLayoutRootNode(layout.root)) {
    return layout;
  }

  return {
    ...layout,
    root: toEditableLayoutRoot(layout),
  };
}

export function fromEditableLayoutDocument(
  layout: UiLayoutDocument,
  scope: "screen" | "legacy",
): UiLayoutDocument {
  if (scope !== "screen") {
    return layout;
  }

  if (!isLayoutRootNode(layout.root)) {
    return layout;
  }

  return {
    ...layout,
    root: layoutRootToScreenRoot(layout.root),
  };
}

export function withEditableRootColumns(
  layout: UiLayoutDocument,
  update: (columns: LayoutRootNode["columns"]) => LayoutRootNode["columns"],
): UiLayoutDocument {
  const root = asEditableLayoutRoot(layout.root);
  return {
    ...layout,
    root: {
      ...root,
      columns: update(root.columns),
    },
  };
}

export function resolveLayoutRootColumns(
  layout: UiLayoutDocument,
): LayoutRootNode["columns"] {
  return toEditableLayoutRoot(layout).columns;
}
