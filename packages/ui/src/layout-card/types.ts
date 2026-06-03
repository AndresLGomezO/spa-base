/** Card field presentation types used by layout primitives. */

export type CardLabelPosition = "above" | "below";

export type CardBadgeVariant =
  | "success"
  | "warning"
  | "danger"
  | "info"
  | "default"
  | "active"
  | "pending"
  | "closed"
  | "neutral";

export type LayoutAlign = "start" | "center" | "end" | "stretch";
export type LayoutJustify = "start" | "center" | "end" | "between";
export type LayoutDirection = "row" | "column";
export type LayoutSize = number | string;

export type LayoutNode = LayoutNodeBase;

export interface LayoutNodeBase {
  readonly id?: string;
  readonly className?: string;
  readonly minWidth?: LayoutSize;
  readonly maxWidth?: LayoutSize;
  readonly minHeight?: LayoutSize;
  readonly maxHeight?: LayoutSize;
  readonly flex?: number | string;
  readonly align?: LayoutAlign;
  readonly justify?: LayoutJustify;
}
