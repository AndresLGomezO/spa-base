import type { ReactNode } from "react";

export type LayoutAlign = "start" | "center" | "end" | "stretch";
export type LayoutJustify = "start" | "center" | "end" | "between";
export type LayoutDirection = "row" | "column";

export type LayoutSize = number | string;

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

type CardFieldSlotComponentType =
  | "text"
  | "labeled-text"
  | "image"
  | "badge"
  | "currency";

export type CardSlotComponentType = CardFieldSlotComponentType | "metric-kpi";

export type { CardBadgeVariant } from "./badge-variants.js";
import type { CardBadgeVariant } from "./badge-variants.js";

interface MetricBindingSourceStatic {
  readonly type: "static";
  readonly value: string | number | boolean;
}

interface MetricBindingSourceEntityField {
  readonly type: "entityField";
  readonly fieldPath: string;
}

interface MetricBindingSourceListFilter {
  readonly type: "listFilter";
  readonly field: string;
}

interface MetricBindingSourceRouteParam {
  readonly type: "routeParam";
  readonly param: string;
}

type MetricBindingSource =
  | MetricBindingSourceStatic
  | MetricBindingSourceEntityField
  | MetricBindingSourceListFilter
  | MetricBindingSourceRouteParam;

export interface CardFieldSlotBinding {
  readonly component: CardFieldSlotComponentType;
  readonly fieldPath: string;
  readonly showLabel?: boolean;
  readonly label?: string;
  readonly className?: string;
  readonly imageSize?: number;
  readonly textSize?: number;
  readonly textThin?: boolean;
  readonly textBold?: boolean;
  readonly textItalic?: boolean;
  readonly textUnderline?: boolean;
  readonly badgeVariants?: Readonly<Record<string, CardBadgeVariant>>;
}

export interface CardMetricKpiSlotBinding {
  readonly component: "metric-kpi";
  readonly metricDefinitionId: string;
  readonly groupBindings: Readonly<Record<string, MetricBindingSource>>;
  readonly dimensionBindings: Readonly<Record<string, MetricBindingSource>>;
  readonly label?: string;
  readonly className?: string;
  readonly textSize?: number;
  readonly textBold?: boolean;
}

export type CardSlotBinding = CardFieldSlotBinding | CardMetricKpiSlotBinding;

export interface CardLayoutConfig {
  readonly root: LayoutNode;
  readonly slots: Readonly<Record<string, CardSlotBinding>>;
  readonly showActions?: boolean;
  readonly cardsPerRow?: number;
}

export type CardSlotRenderer = (
  slotId: string,
  binding: CardSlotBinding | undefined,
) => ReactNode;
