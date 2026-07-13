import {
  moveRowAt,
  removeRowAt,
  setGridTemplateColumns,
  setGridTrackCount,
  setRootColumnWidthPercent,
  toEditableLayoutDocument,
  updateComponentRowAt,
  updateComponentRowMetaAt,
  updateGridRowMetaAt,
  updateLayoutMeta,
  updateRootColumnDisplayRange,
  updateRootColumnMetaAt,
  updateRootColumnStackDirection,
  updateRootColumnStyles,
  updateRootNodeStyles,
  type ColumnNode,
  type ComponentRowNode,
  type MotionPreset,
  type StyleRule,
  type UiComponentConfig,
  type UiLayoutDocument,
} from "@repo/ui-builder-core";

import type { ComponentRowRef } from "./component-row-ref.js";

export interface LayoutEditorBinding {
  readonly layout: UiLayoutDocument;
  readonly setLayout: (layout: UiLayoutDocument) => void;
  readonly removeRow: (rowRef: ComponentRowRef) => void;
  readonly moveRow: (rowRef: ComponentRowRef, direction: -1 | 1) => void;
  readonly updateComponent: (
    rowRef: ComponentRowRef,
    component: UiComponentConfig,
  ) => void;
  readonly updateRowMeta: (
    rowRef: ComponentRowRef,
    patch: Partial<
      Pick<
        ComponentRowNode,
        | "styles"
        | "motion"
        | "displayFrom"
        | "displayTo"
        | "name"
        | "clickAction"
        | "visibleWhen"
      >
    >,
  ) => void;
  readonly setGridRowTrackCount: (
    rowRef: ComponentRowRef,
    trackCount: number,
  ) => void;
  readonly setGridRowTemplateColumns: (
    rowRef: ComponentRowRef,
    gridTemplateColumns: string,
  ) => void;
  readonly updateGridRowMeta: (
    rowRef: ComponentRowRef,
    patch: Partial<
      Pick<
        ComponentRowNode,
        "styles" | "displayFrom" | "displayTo" | "name" | "visibleWhen"
      >
    > & {
      readonly gap?: string;
      readonly alignItems?: import("@repo/ui-builder-core").LayoutAlign;
    },
  ) => void;
  readonly updateLayoutMotion: (motion: MotionPreset | undefined) => void;
  readonly updateRootColumn: (
    columnIndex: number,
    patch: {
      readonly widthPercent?: number | undefined;
      readonly stackDirection?: ColumnNode["stackDirection"];
      readonly styles?: readonly StyleRule[];
      readonly displayFrom?: ColumnNode["displayFrom"];
      readonly displayTo?: ColumnNode["displayTo"];
      readonly visibleWhen?: ColumnNode["visibleWhen"];
      readonly name?: ColumnNode["name"];
    },
  ) => void;
  readonly updateRootLayoutStyles: (styles: readonly StyleRule[]) => void;
}

export function createLayoutEditorBinding(
  layout: UiLayoutDocument,
  setLayout: (layout: UiLayoutDocument) => void,
): LayoutEditorBinding {
  let currentLayout = toEditableLayoutDocument(layout);

  const applyLayout = (next: UiLayoutDocument) => {
    currentLayout = toEditableLayoutDocument(next);
    setLayout(currentLayout);
  };

  const binding: LayoutEditorBinding = {
    get layout() {
      return currentLayout;
    },
    setLayout: applyLayout,
    removeRow: (rowRef: ComponentRowRef) => {
      applyLayout(removeRowAt(currentLayout, rowRef.locator, rowRef.rowId));
    },
    moveRow: (rowRef: ComponentRowRef, direction: -1 | 1) => {
      applyLayout(
        moveRowAt(currentLayout, rowRef.locator, rowRef.rowId, direction),
      );
    },
    updateComponent: (rowRef, component) => {
      applyLayout(
        updateComponentRowAt(
          currentLayout,
          rowRef.locator,
          rowRef.rowId,
          component,
        ),
      );
    },
    updateRowMeta: (rowRef, patch) => {
      applyLayout(
        updateComponentRowMetaAt(
          currentLayout,
          rowRef.locator,
          rowRef.rowId,
          patch,
        ),
      );
    },
    setGridRowTrackCount: (rowRef, trackCount) => {
      applyLayout(
        setGridTrackCount(
          currentLayout,
          rowRef.locator,
          rowRef.rowId,
          trackCount,
        ),
      );
    },
    setGridRowTemplateColumns: (rowRef, gridTemplateColumns) => {
      applyLayout(
        setGridTemplateColumns(
          currentLayout,
          rowRef.locator,
          rowRef.rowId,
          gridTemplateColumns,
        ),
      );
    },
    updateGridRowMeta: (rowRef, patch) => {
      applyLayout(
        updateGridRowMetaAt(currentLayout, rowRef.locator, rowRef.rowId, patch),
      );
    },
    updateLayoutMotion: (motion) => {
      applyLayout(updateLayoutMeta(currentLayout, { motion }));
    },
    updateRootColumn: (columnIndex, patch) => {
      let next = currentLayout;
      if ("widthPercent" in patch) {
        next = setRootColumnWidthPercent(next, columnIndex, patch.widthPercent);
      }
      if (patch.stackDirection !== undefined) {
        next = updateRootColumnStackDirection(
          next,
          columnIndex,
          patch.stackDirection,
        );
      }
      if (patch.styles !== undefined) {
        next = updateRootColumnStyles(next, columnIndex, patch.styles);
      }
      if ("displayFrom" in patch || "displayTo" in patch) {
        next = updateRootColumnDisplayRange(next, columnIndex, patch);
      }
      if ("name" in patch || "visibleWhen" in patch) {
        next = updateRootColumnMetaAt(next, columnIndex, {
          ...("name" in patch ? { name: patch.name } : {}),
          ...("visibleWhen" in patch ? { visibleWhen: patch.visibleWhen } : {}),
        });
      }
      applyLayout(next);
    },
    updateRootLayoutStyles: (styles) => {
      applyLayout(updateRootNodeStyles(currentLayout, styles));
    },
  };

  return binding;
}

export function areLayoutSnapshotsEqual(
  left: UiLayoutDocument,
  right: UiLayoutDocument,
): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}
