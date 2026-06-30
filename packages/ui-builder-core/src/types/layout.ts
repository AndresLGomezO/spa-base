/**
 * @ai-context-sync
 * Layout node visibility (displayFrom/displayTo) — keep in sync with
 * packages/ai-context/src/atoms/ui/responsive-visibility.ts
 */
import type { StyleRule } from "../styles/style-types.js";
import type { ComponentClickAction } from "./click-action.js";
import type { UiComponentConfig } from "./component.js";
import type { MotionPreset } from "./motion.js";
import type { ResponsiveGridBreakpoint } from "../layout/responsive-grid.js";

export type LayoutAlign = "start" | "center" | "end" | "stretch";

/** How component rows inside a column are stacked (default: column / vertical). */
export type ColumnStackDirection = "column" | "row";

export interface UiLayoutDocument {
  readonly root: LayoutRootNode;
  readonly showActions?: boolean;
  readonly cardsPerRow?: number;
  readonly motion?: MotionPreset;
}

export interface LayoutRootNode {
  readonly type: "root";
  readonly id: string;
  readonly columnCount: number;
  readonly columns: readonly ColumnNode[];
  readonly styles?: readonly StyleRule[];
}

export interface ColumnNode {
  readonly id: string;
  readonly rows: readonly RowNode[];
  /** Builder-only label override for the structure tree and third rail. */
  readonly name?: string;
  /** Vertical (default) or horizontal stacking of rows in this column. */
  readonly stackDirection?: ColumnStackDirection;
  /** User-set share of the row (1–100). Omitted = auto (split remainder equally). */
  readonly widthPercent?: number;
  readonly styles?: readonly StyleRule[];
  readonly displayFrom?: ResponsiveGridBreakpoint;
  readonly displayTo?: ResponsiveGridBreakpoint;
}

export type RowNode = ComponentRowNode | NestedLayoutRowNode;

export interface ComponentRowNode {
  readonly type: "component";
  readonly id: string;
  readonly component: UiComponentConfig;
  /** Builder-only label override for the structure tree and third rail. */
  readonly name?: string;
  readonly clickAction?: ComponentClickAction;
  readonly styles?: readonly StyleRule[];
  readonly motion?: MotionPreset;
  readonly displayFrom?: ResponsiveGridBreakpoint;
  readonly displayTo?: ResponsiveGridBreakpoint;
}

export interface NestedLayoutRowNode {
  readonly type: "nested-layout";
  readonly id: string;
  readonly columnCount: number;
  readonly columns: readonly ColumnNode[];
  /** Builder-only label override for the structure tree and third rail. */
  readonly name?: string;
  readonly styles?: readonly StyleRule[];
  readonly displayFrom?: ResponsiveGridBreakpoint;
  readonly displayTo?: ResponsiveGridBreakpoint;
}

export function resolveColumnStackDirection(
  column: ColumnNode,
): ColumnStackDirection {
  return column.stackDirection ?? "column";
}
