/**
 * Migrates legacy container layout to grid structural primitives (Section 15.1).
 */
import { createLayoutId } from "../builder/id.js";
import type {
  ContainerComponentConfig,
  GridComponentConfig,
  UiComponentConfig,
} from "../types/component.js";
import { isContainerComponent } from "../types/component.js";
import type {
  ColumnNode,
  ComponentRowNode,
  LayoutRootNode,
  RowNode,
  ScreenRootNode,
  UiLayoutDocument,
} from "../types/layout.js";
import { isLayoutRootNode, isScreenRootNode } from "../types/layout.js";
import { filterVisualStyleRules } from "../types/layout-props.js";
import {
  buildGridTemplateColumnsFromPercents,
  resolveColumnWidthPercents,
} from "./resolve-column-width-percents.js";

function resolveGridTemplateColumns(
  stackDirection: ContainerComponentConfig["stackDirection"],
  childCount: number,
): string {
  if (stackDirection === "row" && childCount > 1) {
    return `repeat(${childCount}, 1fr)`;
  }

  return "1fr";
}

function migrateComponentConfig(
  component: UiComponentConfig,
): UiComponentConfig {
  if (!isContainerComponent(component) || component.rows.length === 0) {
    return component;
  }

  const migratedRows = migrateRows(component.rows);
  const grid: GridComponentConfig = {
    kind: "grid",
    gridTemplateColumns: resolveGridTemplateColumns(
      component.stackDirection,
      migratedRows.length,
    ),
    rows: migratedRows,
    styles: component.styles
      ? filterVisualStyleRules(component.styles)
      : undefined,
  };

  return grid;
}

export function migrateNestedLayoutsInDocument(
  layout: UiLayoutDocument,
): UiLayoutDocument {
  return migrateContainerLayoutToGrid(layout);
}

function columnNodeToGridTrackRow(column: ColumnNode): ComponentRowNode {
  const migratedRows = migrateRows(column.rows);

  return {
    type: "component",
    id: column.id,
    name: column.name,
    component: {
      kind: "container",
      rows: migratedRows,
      styles: column.styles ? filterVisualStyleRules(column.styles) : undefined,
    },
    displayFrom: column.displayFrom,
    displayTo: column.displayTo,
  };
}

function layoutRootColumnsToGridRow(root: LayoutRootNode): ComponentRowNode {
  const migratedColumns = root.columns.map((column) => ({
    ...column,
    rows: migrateRows(column.rows),
  }));
  const gridTemplateColumns = buildGridTemplateColumnsFromPercents(
    resolveColumnWidthPercents(migratedColumns),
  );

  const grid: GridComponentConfig = {
    kind: "grid",
    gridTemplateColumns,
    rows: migratedColumns.map(columnNodeToGridTrackRow),
    styles: root.styles ? filterVisualStyleRules(root.styles) : undefined,
  };

  return {
    type: "component",
    id: createLayoutId("row"),
    component: grid,
  };
}

function migrateRow(row: RowNode): RowNode {
  if (row.type === "component" && isContainerComponent(row.component)) {
    return {
      ...row,
      component: migrateComponentConfig(row.component),
    };
  }

  if (row.type === "component" && row.component.kind === "grid") {
    return {
      ...row,
      component: {
        ...row.component,
        rows: migrateRows(row.component.rows),
      },
    };
  }

  return row;
}

function migrateRows(rows: readonly RowNode[]): readonly RowNode[] {
  return rows.map(migrateRow);
}

export function migrateContainerLayoutToGrid(
  layout: UiLayoutDocument,
): UiLayoutDocument {
  if (isScreenRootNode(layout.root)) {
    return {
      ...layout,
      root: {
        ...layout.root,
        rows: migrateRows(layout.root.rows),
      },
    };
  }

  return {
    ...layout,
    root: {
      ...layout.root,
      columns: layout.root.columns.map((column) => ({
        ...column,
        rows: migrateRows(column.rows),
      })),
    },
  };
}

export function createScreenRootNode(
  rows: readonly RowNode[] = [],
  options?: {
    readonly gridTemplateColumns?: string;
    readonly gap?: string;
  },
): ScreenRootNode {
  return {
    type: "screen-root",
    id: createLayoutId("screen-root"),
    gridTemplateColumns: options?.gridTemplateColumns ?? "1fr",
    gap: options?.gap,
    rows: [...rows],
  };
}

/** Converts legacy column root to screen-root for screen scope documents. */
export function layoutRootToScreenRoot(root: LayoutRootNode): ScreenRootNode {
  const rows =
    root.columns.length === 1
      ? migrateRows(root.columns[0]?.rows ?? [])
      : [layoutRootColumnsToGridRow(root)];

  return createScreenRootNode(rows, {
    gridTemplateColumns:
      root.columnCount > 1 ? `repeat(${root.columnCount}, 1fr)` : "1fr",
  });
}

export function ensureScreenRootDocument(
  layout: UiLayoutDocument,
): UiLayoutDocument {
  const migrated = migrateNestedLayoutsInDocument(layout);

  if (isScreenRootNode(migrated.root)) {
    return migrated;
  }

  if (!isLayoutRootNode(migrated.root)) {
    return migrated;
  }

  return {
    ...migrated,
    root: layoutRootToScreenRoot(migrated.root),
  };
}
