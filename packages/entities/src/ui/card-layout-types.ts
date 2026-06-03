import type { CardMetricKpiSlotBinding } from "./metric-widget-types.js";
import type { FieldDateDisplayFormat } from "./types.js";
import type { LayoutSpacing } from "./layout-spacing.js";

export type { LayoutSpacing };

export type LayoutAlign = "start" | "center" | "end" | "stretch";
export type LayoutJustify = "start" | "center" | "end" | "between";
export type LayoutDirection = "row" | "column";
export type LayoutSize = number | string;

export interface LayoutNodeBase extends LayoutSpacing {
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

export interface LayoutContainerNode extends LayoutNodeBase {
  readonly type: "grid" | "stack";
  readonly direction?: LayoutDirection;
  readonly gap?: number;
  readonly columns?: number | string;
  readonly children: readonly LayoutNode[];
}

export interface LayoutSlotNode extends LayoutNodeBase {
  readonly type: "slot";
  readonly slotId: string;
}

export type LayoutNode = LayoutContainerNode | LayoutSlotNode;

export type CardFieldSlotComponentType =
  | "text"
  | "labeled-text"
  | "image"
  | "badge"
  | "currency"
  | "date";

export type CardSlotComponentType = CardFieldSlotComponentType | "metric-kpi";

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

export type CardLabelPosition = "above" | "below";

export type CardTextColor =
  | "default"
  | "muted"
  | "primary"
  | "success"
  | "warning"
  | "danger"
  | "info";

export interface CardFieldSlotBinding extends LayoutSpacing {
  readonly component: CardFieldSlotComponentType;
  readonly fieldPath: string;
  readonly fallbackFieldPaths?: readonly string[];
  readonly staticText?: string;
  readonly align?: LayoutAlign;
  readonly showLabel?: boolean;
  readonly label?: string;
  readonly labelPosition?: CardLabelPosition;
  readonly dateDisplayFormat?: FieldDateDisplayFormat;
  readonly className?: string;
  readonly imageSize?: number;
  readonly textSize?: number;
  readonly textColor?: CardTextColor;
  readonly textThin?: boolean;
  readonly textBold?: boolean;
  readonly textItalic?: boolean;
  readonly textUnderline?: boolean;
  readonly badgeVariants?: Readonly<Record<string, CardBadgeVariant>>;
}

export type CardSlotBinding = CardFieldSlotBinding | CardMetricKpiSlotBinding;

export interface CardLayoutConfig {
  readonly root: LayoutNode;
  readonly slots: Readonly<Record<string, CardSlotBinding>>;
  readonly showActions?: boolean;
  readonly cardsPerRow?: number;
}

export type { CardMetricKpiSlotBinding };
