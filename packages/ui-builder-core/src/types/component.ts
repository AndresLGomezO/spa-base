import type { StyleRule } from "../styles/style-types.js";
import type { ConditionalStyleRule, LabelConfig } from "./styling.js";

export type UiComponentKind =
  | "text"
  | "image"
  | "date"
  | "numeric"
  | "badge"
  | "metric-kpi";

export type DataSource =
  | { readonly type: "field"; readonly path: string }
  | { readonly type: "static"; readonly value: string };

export type FieldDateDisplayFormat = "date" | "datetime" | "time";

export type NumericDisplayFormat = "currency" | "plain" | "percentage";

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

export type MetricBindingSource =
  | { readonly type: "static"; readonly value: string | number | boolean }
  | { readonly type: "entityField"; readonly fieldPath: string }
  | { readonly type: "listFilter"; readonly field: string }
  | { readonly type: "routeParam"; readonly param: string };

export interface MetricKpiComponentConfig {
  readonly kind: "metric-kpi";
  readonly metricDefinitionId: string;
  readonly groupBindings: Readonly<Record<string, MetricBindingSource>>;
  readonly dimensionBindings: Readonly<Record<string, MetricBindingSource>>;
  readonly label?: string;
  readonly styles?: readonly StyleRule[];
}

export interface FieldComponentConfigBase {
  readonly primary: DataSource;
  readonly fallbacks?: readonly DataSource[];
  readonly label?: LabelConfig;
  readonly styles?: readonly StyleRule[];
  readonly conditionalStyles?: readonly ConditionalStyleRule[];
}

export interface TextComponentConfig extends FieldComponentConfigBase {
  readonly kind: "text";
}

export interface ImageComponentConfig extends FieldComponentConfigBase {
  readonly kind: "image";
  readonly imageSize?: number;
}

export interface DateComponentConfig extends FieldComponentConfigBase {
  readonly kind: "date";
  readonly dateDisplayFormat?: FieldDateDisplayFormat;
}

export interface NumericComponentConfig extends FieldComponentConfigBase {
  readonly kind: "numeric";
  readonly displayFormat?: NumericDisplayFormat;
  /** Shows currency code suffix (e.g. USD) from layout context. Default: off. */
  readonly showCurrency?: boolean;
  /** Colors positive/negative amounts. Default: off. */
  readonly showToneColors?: boolean;
}

export interface BadgeComponentConfig extends FieldComponentConfigBase {
  readonly kind: "badge";
}

export type FieldUiComponentConfig =
  | TextComponentConfig
  | ImageComponentConfig
  | DateComponentConfig
  | NumericComponentConfig
  | BadgeComponentConfig;

export type UiComponentConfig =
  | FieldUiComponentConfig
  | MetricKpiComponentConfig;

export function isMetricKpiComponent(
  config: UiComponentConfig,
): config is MetricKpiComponentConfig {
  return config.kind === "metric-kpi";
}
