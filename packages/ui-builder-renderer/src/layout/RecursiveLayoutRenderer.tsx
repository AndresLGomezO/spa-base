import type { ReactNode } from "react";
import {
  componentSlotWrapperClassName,
  gapPxFromStyles,
  parseFlexLayoutFromStyles,
  resolveColumnStackDirection,
  resolveStyleRules,
  type ColumnNode,
  type ColumnStackDirection,
  type RowNode,
  type UiLayoutDocument,
} from "@repo/ui-builder-core";
import { LayoutGrid, LayoutStack } from "@repo/ui";

import type { LayoutRenderContext } from "../context.js";
import { renderUiComponent } from "../engine/render-component.js";
import { resolveMotionPreset } from "../motion/resolve-motion.js";

/** Fills the grid/flex column cell so backgrounds and padding cover the full slot. */
const COLUMN_SHELL_CLASS = "flex h-full min-h-0 w-full min-w-0 flex-col";

function renderRows(
  rows: readonly RowNode[],
  context: LayoutRenderContext,
  column: ColumnNode,
  rowMotionIndexOffset = 0,
): ReactNode {
  const stackDirection = resolveColumnStackDirection(column);
  const columnFlex = parseFlexLayoutFromStyles(column.styles);

  return (
    <LayoutStack
      direction={stackDirection}
      gap={gapPxFromStyles(column.styles)}
      className={[
        "flex min-h-0 w-full min-w-0 flex-1",
        stackDirection === "column" ? "flex-col" : "flex-row",
      ].join(" ")}
      align={columnFlex.align}
      justify={columnFlex.justify}
    >
      {rows.map((row, rowIndex) =>
        renderRow(
          row,
          context,
          stackDirection,
          rowIndex + rowMotionIndexOffset,
        ),
      )}
    </LayoutStack>
  );
}

function rowStackShellClassName(
  stackDirection: ColumnStackDirection,
): string | undefined {
  return stackDirection === "row" ? "min-w-0 shrink-0" : undefined;
}

function renderRow(
  row: RowNode,
  context: LayoutRenderContext,
  stackDirection: ColumnStackDirection,
  rowIndex = 0,
): ReactNode {
  const stackShellClass = rowStackShellClassName(stackDirection);

  if (row.type === "component") {
    const rowStyles = resolveStyleRules(row.styles);
    const motionClass = resolveMotionPreset(row.motion, rowIndex);
    return (
      <div
        key={row.id}
        className={[
          stackShellClass,
          rowStyles.className,
          componentSlotWrapperClassName(row.component.styles),
          motionClass,
        ]
          .filter(Boolean)
          .join(" ")}
        style={rowStyles.style}
      >
        {renderUiComponent(row.component, context)}
      </div>
    );
  }

  const rowStyles = resolveStyleRules(row.styles);
  return (
    <div
      key={row.id}
      className={[stackShellClass, rowStyles.className]
        .filter(Boolean)
        .join(" ")}
      style={rowStyles.style}
    >
      <LayoutGrid
        direction="row"
        gap={gapPxFromStyles(row.styles)}
        columns={row.columnCount}
        align="stretch"
      >
        {row.columns.map((column) => renderColumn(column, context))}
      </LayoutGrid>
    </div>
  );
}

function renderColumn(
  column: ColumnNode,
  context: LayoutRenderContext,
): ReactNode {
  if (column.rows.length === 0) {
    return null;
  }

  const columnStyles = resolveStyleRules(column.styles);

  return (
    <div
      key={column.id}
      className={[COLUMN_SHELL_CLASS, columnStyles.className]
        .filter(Boolean)
        .join(" ")}
      style={columnStyles.style}
    >
      {renderRows(column.rows, context, column)}
    </div>
  );
}

export interface RecursiveLayoutRendererProps {
  readonly layout: UiLayoutDocument;
  readonly context: LayoutRenderContext;
  readonly className?: string;
}

export function RecursiveLayoutRenderer({
  layout,
  context,
  className,
}: RecursiveLayoutRendererProps): ReactNode {
  const rootStyles = resolveStyleRules(layout.root.styles, className);
  const rootMotionClass = resolveMotionPreset(layout.motion);
  return (
    <div
      className={[rootStyles.className, rootMotionClass]
        .filter(Boolean)
        .join(" ")}
      style={rootStyles.style}
    >
      <LayoutGrid
        direction="row"
        gap={gapPxFromStyles(layout.root.styles)}
        columns={layout.root.columnCount}
        align="stretch"
        className="min-h-0 w-full items-stretch"
      >
        {layout.root.columns.map((column) => renderColumn(column, context))}
      </LayoutGrid>
    </div>
  );
}
