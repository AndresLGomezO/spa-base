/**
 * @ai-context-sync
 * Layout node visibility (displayFrom/displayTo, visibleWhen) — keep in sync with
 * packages/ai-context/src/atoms/ui/responsive-visibility.ts
 */
import type { StyleRule } from "../styles/style-types.js";
import type { ComponentClickAction } from "./click-action.js";
import type { UiComponentConfig } from "./component.js";
import type { MotionPreset } from "./motion.js";
import type { ResponsiveGridBreakpoint } from "../layout/responsive-grid.js";
import type { LayoutCondition } from "./styling.js";

export type LayoutVisibleWhen = readonly LayoutCondition[];

export type LayoutAlign = "start" | "center" | "end" | "stretch";

/** How component rows inside a column are stacked (default: column / vertical). */
export type ColumnStackDirection = "column" | "row";

/** One tab in a main-page Summary third rail. */
export interface UiLayoutSummaryTab {
  readonly id: string;
  readonly label: string;
  /** String field path on `summary.sourceEntity`. */
  readonly field: string;
}

/**
 * Main-page Summary config: load a source entity record and show Markdown
 * tabs in an AI third rail. Empty/omitted = no Summary button.
 */
export interface UiLayoutSummary {
  readonly sourceEntity: string;
  /** Optional fixed record id; omit to load the first list row. */
  readonly sourceRecordId?: string;
  readonly tabs: readonly UiLayoutSummaryTab[];
}

export interface UiLayoutDocument {
  readonly root: LayoutRootNode | ScreenRootNode;
  readonly showActions?: boolean;
  readonly cardsPerRow?: number;
  readonly motion?: MotionPreset;
  /**
   * Optional entity field path whose string value opens the detail Summary
   * third rail (Markdown). Empty/omitted = no Summary button.
   */
  readonly summaryField?: string;
  /**
   * Optional main-page Summary third rail (source entity + Markdown tabs).
   * Empty/omitted = no Summary button on the entity main page.
   */
  readonly summary?: UiLayoutSummary;
}

export interface ScreenRootNode {
  readonly type: "screen-root";
  readonly id: string;
  readonly gridTemplateColumns: string;
  readonly gap?: string;
  readonly alignItems?: LayoutAlign;
  readonly rows: readonly RowNode[];
  readonly styles?: readonly StyleRule[];
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
  /** When set, hide this column (and children) unless all conditions match. */
  readonly visibleWhen?: LayoutVisibleWhen;
}

export type RowNode = ComponentRowNode;

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
  /** When set, hide this row (and children) unless all conditions match. */
  readonly visibleWhen?: LayoutVisibleWhen;
}

export function resolveColumnStackDirection(
  column: ColumnNode,
): ColumnStackDirection {
  return column.stackDirection ?? "column";
}

export function isScreenRootNode(
  root: LayoutRootNode | ScreenRootNode,
): root is ScreenRootNode {
  return root.type === "screen-root";
}

export function isLayoutRootNode(
  root: LayoutRootNode | ScreenRootNode,
): root is LayoutRootNode {
  return root.type === "root";
}
