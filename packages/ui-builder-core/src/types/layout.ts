import type { StyleRule } from "../styles/style-types.js";
import type { UiComponentConfig } from "./component.js";
import type { MotionPreset } from "./motion.js";

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
  /** Vertical (default) or horizontal stacking of rows in this column. */
  readonly stackDirection?: ColumnStackDirection;
  /** User-set share of the row (1–100). Omitted = auto (split remainder equally). */
  readonly widthPercent?: number;
  readonly styles?: readonly StyleRule[];
}

export type RowNode = ComponentRowNode | NestedLayoutRowNode;

export interface ComponentRowNode {
  readonly type: "component";
  readonly id: string;
  readonly component: UiComponentConfig;
  readonly styles?: readonly StyleRule[];
  readonly motion?: MotionPreset;
}

export interface NestedLayoutRowNode {
  readonly type: "nested-layout";
  readonly id: string;
  readonly columnCount: number;
  readonly columns: readonly ColumnNode[];
  readonly styles?: readonly StyleRule[];
}

export function resolveColumnStackDirection(
  column: ColumnNode,
): ColumnStackDirection {
  return column.stackDirection ?? "column";
}
