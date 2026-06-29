import type { RowLocator } from "../builder/mutations.js";
import {
  containerEstablishesDefiniteHeight,
  containerUsesPercentSplitHeight,
  isOverlayImageRow,
  resolveContainerPercentSplitFlexStyle,
} from "./container-overlay.js";
import { resolveColumnStackDirection } from "../types/layout.js";
import type {
  ColumnStackDirection,
  RowNode,
  UiLayoutDocument,
} from "../types/layout.js";
import type { StyleRule } from "../styles/style-types.js";
import { isContainerComponent } from "../types/component.js";
import {
  flexWrapRowItemClassName,
  isFlexWrapRowStack,
  parseFlexLayoutFromStyles,
  rowPrefersContentWidth,
  type FlexAlign,
  type LayoutInlineStyle,
} from "../styles/apply-style-rules.js";

function findRowNodeInRows(
  rows: readonly RowNode[],
  rowId: string,
): RowNode | null {
  for (const row of rows) {
    if (row.id === rowId) {
      return row;
    }

    if (row.type === "component" && isContainerComponent(row.component)) {
      const found = findRowNodeInRows(row.component.rows, rowId);
      if (found) {
        return found;
      }
    }

    if (row.type === "nested-layout") {
      for (const column of row.columns) {
        const found = findRowNodeInRows(column.rows, rowId);
        if (found) {
          return found;
        }
      }
    }
  }

  return null;
}

function findRowNodeInLayout(
  layout: UiLayoutDocument,
  rowId: string,
): RowNode | null {
  for (const column of layout.root.columns) {
    const found = findRowNodeInRows(column.rows, rowId);
    if (found) {
      return found;
    }
  }

  return null;
}

function readStackAlignFromStyles(
  styles: readonly StyleRule[] | undefined,
): FlexAlign | undefined {
  return parseFlexLayoutFromStyles(styles).align;
}

export function resolveParentStackDirection(
  layout: UiLayoutDocument,
  locator: RowLocator,
): ColumnStackDirection {
  switch (locator.scope) {
    case "root": {
      const column = layout.root.columns[locator.columnIndex];
      return column ? resolveColumnStackDirection(column) : "column";
    }
    case "container": {
      const containerRow = findRowNodeInLayout(layout, locator.containerRowId);
      if (
        containerRow?.type === "component" &&
        isContainerComponent(containerRow.component)
      ) {
        return containerRow.component.stackDirection ?? "column";
      }
      return "column";
    }
    case "nested": {
      const nestedRow = findRowNodeInLayout(layout, locator.rowId);
      if (nestedRow?.type === "nested-layout") {
        const column = nestedRow.columns[locator.nestedColumnIndex];
        return column ? resolveColumnStackDirection(column) : "column";
      }
      return "column";
    }
  }
}

export function resolveParentStackAlign(
  layout: UiLayoutDocument,
  locator: RowLocator,
): FlexAlign | undefined {
  switch (locator.scope) {
    case "root": {
      const column = layout.root.columns[locator.columnIndex];
      return column ? readStackAlignFromStyles(column.styles) : undefined;
    }
    case "container": {
      const containerRow = findRowNodeInLayout(layout, locator.containerRowId);
      if (
        containerRow?.type === "component" &&
        isContainerComponent(containerRow.component)
      ) {
        return readStackAlignFromStyles(containerRow.component.styles);
      }
      return undefined;
    }
    case "nested": {
      const nestedRow = findRowNodeInLayout(layout, locator.rowId);
      if (nestedRow?.type === "nested-layout") {
        const column = nestedRow.columns[locator.nestedColumnIndex];
        return column ? readStackAlignFromStyles(column.styles) : undefined;
      }
      return undefined;
    }
  }
}

export function resolveParentStackStyles(
  layout: UiLayoutDocument,
  locator: RowLocator,
): readonly StyleRule[] | undefined {
  switch (locator.scope) {
    case "root": {
      return layout.root.columns[locator.columnIndex]?.styles;
    }
    case "container": {
      const containerRow = findRowNodeInLayout(layout, locator.containerRowId);
      if (
        containerRow?.type === "component" &&
        isContainerComponent(containerRow.component)
      ) {
        return containerRow.component.styles;
      }
      return undefined;
    }
    case "nested": {
      const nestedRow = findRowNodeInLayout(layout, locator.rowId);
      if (nestedRow?.type === "nested-layout") {
        return nestedRow.columns[locator.nestedColumnIndex]?.styles;
      }
      return undefined;
    }
  }
}

export function resolveParentStackUsesFlexWrap(
  layout: UiLayoutDocument,
  locator: RowLocator,
): boolean {
  const parentStyles = resolveParentStackStyles(layout, locator);
  if (!parentStyles) {
    return false;
  }

  return isFlexWrapRowStack(
    resolveParentStackDirection(layout, locator),
    parentStyles,
  );
}

export function rowPrefersFlexGrow(row: RowNode): boolean {
  if (row.type !== "component") {
    return false;
  }

  return (
    row.component.styles?.some(
      (rule) => rule.property === "flex" && String(rule.value) === "1",
    ) ?? false
  );
}

export function rowUsesContentWidth(row: RowNode): boolean {
  if (row.type !== "component") {
    return false;
  }

  return rowPrefersContentWidth(row.component.styles);
}

function rowHasFixedExplicitHeight(row: RowNode): boolean {
  if (row.type !== "component") {
    return false;
  }

  return containerEstablishesDefiniteHeight(row.component.styles);
}

function rowHasPercentSplitHeight(row: RowNode): boolean {
  if (row.type !== "component") {
    return false;
  }

  return containerUsesPercentSplitHeight(row.component.styles);
}

export interface RowShellLayoutClasses {
  readonly shell: string;
  readonly inner: string;
  readonly shellStyle?: LayoutInlineStyle;
}

const overlayImageRowShellClasses: RowShellLayoutClasses = {
  shell: "absolute inset-0 z-0 flex flex-col",
  inner: "flex h-full min-h-0 w-full min-w-0 flex-col",
};

function resolveRowShellLayoutStyle(
  row: RowNode,
  parentStackDirection: ColumnStackDirection,
): LayoutInlineStyle | undefined {
  if (row.type !== "component" || !isContainerComponent(row.component)) {
    return undefined;
  }

  if (parentStackDirection !== "column") {
    return undefined;
  }

  const splitFlex = resolveContainerPercentSplitFlexStyle(row.component.styles);
  if (!splitFlex) {
    return undefined;
  }

  return splitFlex;
}

export function resolveRowShellLayoutClasses(options: {
  readonly parentStackDirection: ColumnStackDirection;
  readonly parentStackAlign?: FlexAlign;
  readonly parentUsesFlexWrap?: boolean;
  readonly parentStackStyles?: readonly StyleRule[];
  readonly row?: RowNode;
  readonly isStructuralRow: boolean;
  readonly preferFlexGrow: boolean;
  readonly preferContentWidth: boolean;
}): RowShellLayoutClasses {
  if (options.row && isOverlayImageRow(options.row)) {
    return overlayImageRowShellClasses;
  }

  if (options.row && rowHasFixedExplicitHeight(options.row)) {
    return {
      shell: "relative flex min-h-0 w-full min-w-0 shrink-0 flex-col",
      inner: "relative z-0 flex min-h-0 w-full min-w-0 flex-col",
    };
  }

  if (options.row && rowHasPercentSplitHeight(options.row)) {
    const shellStyle = resolveRowShellLayoutStyle(
      options.row,
      options.parentStackDirection,
    );

    if (shellStyle) {
      return {
        shell: "relative flex min-h-0 h-full w-full min-w-0 shrink-0 flex-col",
        inner: "relative z-0 flex h-full min-h-0 w-full min-w-0 flex-col",
        shellStyle,
      };
    }

    return {
      shell: "relative flex min-h-0 w-full min-w-0 shrink-0 flex-col",
      inner: "relative z-0 flex min-h-0 w-full min-w-0 flex-col",
    };
  }

  const parentUsesContentWidth =
    options.parentStackDirection === "column" &&
    (options.parentStackAlign === "start" ||
      options.parentStackAlign === "end");

  const useContentWidth =
    options.parentStackDirection === "row"
      ? !options.isStructuralRow &&
        !options.preferFlexGrow &&
        (options.preferContentWidth || parentUsesContentWidth)
      : parentUsesContentWidth || options.preferContentWidth;

  if (
    options.parentUsesFlexWrap &&
    options.parentStackDirection === "row" &&
    options.row
  ) {
    const flexItemClass = flexWrapRowItemClassName(
      options.parentStackDirection,
      options.parentStackStyles,
      options.row,
    );

    if (flexItemClass) {
      return {
        shell: `relative flex min-h-0 flex-col ${flexItemClass}`,
        inner: "relative z-0 flex min-h-0 min-w-0 w-full max-w-full flex-col",
      };
    }
  }

  if (options.parentStackDirection !== "row") {
    if (options.isStructuralRow || options.preferFlexGrow) {
      return {
        shell: "relative flex h-full min-h-0 w-full min-w-0 flex-1 flex-col",
        inner:
          "relative z-0 flex h-full min-h-0 w-full min-w-0 flex-1 flex-col",
      };
    }

    if (useContentWidth) {
      return {
        shell:
          "relative flex min-h-0 min-w-0 w-fit max-w-full shrink-0 flex-col",
        inner: "relative z-0 flex min-h-0 min-w-0 flex-col",
      };
    }

    return {
      shell: "relative flex h-full min-h-0 w-full min-w-0 flex-1 flex-col",
      inner: "relative z-0 flex h-full min-h-0 w-full min-w-0 flex-1 flex-col",
    };
  }

  if (options.isStructuralRow || options.preferFlexGrow) {
    return {
      shell: "relative flex min-h-0 min-w-0 flex-1 flex-col",
      inner: "relative z-0 flex min-h-0 min-w-0 flex-1 flex-col",
    };
  }

  if (useContentWidth) {
    return {
      shell: "relative flex min-h-0 min-w-0 w-fit max-w-full shrink-0 flex-col",
      inner: "relative z-0 flex min-h-0 min-w-0 flex-col",
    };
  }

  return {
    shell: "relative flex min-h-0 min-w-0 max-w-full shrink-0 flex-col",
    inner: "relative z-0 flex min-h-0 min-w-0 flex-col",
  };
}

/** @deprecated Use {@link resolveRowShellLayoutClasses}. */
export const resolvePreviewRowChromeLayoutClasses =
  resolveRowShellLayoutClasses;

export function resolveProductionRowShellClassName(options: {
  readonly parentStackDirection: ColumnStackDirection;
  readonly parentStackAlign?: FlexAlign;
  readonly parentUsesFlexWrap?: boolean;
  readonly parentStackStyles?: readonly StyleRule[];
  readonly row: RowNode;
  readonly isStructuralRow: boolean;
}): { readonly className: string; readonly style?: LayoutInlineStyle } {
  const layoutClasses = resolveRowShellLayoutClasses({
    parentStackDirection: options.parentStackDirection,
    parentStackAlign: options.parentStackAlign,
    parentUsesFlexWrap: options.parentUsesFlexWrap,
    parentStackStyles: options.parentStackStyles,
    row: options.row,
    isStructuralRow: options.isStructuralRow,
    preferFlexGrow: rowPrefersFlexGrow(options.row),
    preferContentWidth: rowUsesContentWidth(options.row),
  });

  return {
    className: layoutClasses.shell.replace(/^relative /, ""),
    style: layoutClasses.shellStyle,
  };
}

export function isStructuralLayoutRow(row: RowNode): boolean {
  if (row.type === "nested-layout") {
    return true;
  }

  if (row.type === "component" && isContainerComponent(row.component)) {
    return true;
  }

  return false;
}

/** Strip preview-only positioning prefix from shell classes for runtime DOM. */
export function normalizeRuntimeRowShellClassName(shell: string): string {
  return shell.replace(/^relative /, "");
}

/** Strip preview-only positioning prefix from inner shell classes for runtime DOM. */
export function normalizeRuntimeRowInnerClassName(inner: string): string {
  return inner.replace(/^relative z-0 /, "");
}

export function resolveRowShellLayoutForRender(options: {
  readonly parentStackDirection: ColumnStackDirection;
  readonly parentStackAlign?: FlexAlign;
  readonly parentUsesFlexWrap?: boolean;
  readonly parentStackStyles?: readonly StyleRule[];
  readonly row: RowNode;
}): RowShellLayoutClasses {
  return resolveRowShellLayoutClasses({
    parentStackDirection: options.parentStackDirection,
    parentStackAlign: options.parentStackAlign,
    parentUsesFlexWrap: options.parentUsesFlexWrap,
    parentStackStyles: options.parentStackStyles,
    row: options.row,
    isStructuralRow: isStructuralLayoutRow(options.row),
    preferFlexGrow: rowPrefersFlexGrow(options.row),
    preferContentWidth: rowUsesContentWidth(options.row),
  });
}
