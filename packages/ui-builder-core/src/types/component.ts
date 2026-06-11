import type { StyleRule } from "../styles/style-types.js";
import type { ConditionalStyleRule, LabelConfig } from "./styling.js";

export type UiComponentKind =
  | "text"
  | "image"
  | "date"
  | "numeric"
  | "badge"
  | "metric-kpi"
  | "form-field"
  | "entity-field-selector"
  | "form-section"
  | "form-actions"
  | "wizard-progress"
  | "wizard-step-host"
  | "wizard-actions"
  | "related-records"
  | "page-header"
  | "page-toolbar"
  | "page-metrics"
  | "page-list";

export type WizardStepStatusKind =
  | "pending"
  | "active"
  | "completed"
  | "invalid";

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

export type BooleanFieldDisplay = "checkbox" | "switch";

export type SwitchVariant = "ios" | "squared";

export interface FormFieldComponentConfig {
  readonly kind: "form-field";
  readonly fieldPath: string;
  readonly booleanDisplay?: BooleanFieldDisplay;
  readonly switchVariant?: SwitchVariant;
  readonly switchWidth?: number;
  readonly switchHeight?: number;
  readonly multiline?: boolean;
  readonly multilineRows?: number;
  readonly styles?: readonly StyleRule[];
}

export type EntityFieldSelectorLayout =
  | "list"
  | "list-with-logo"
  | "mini-cards";

export interface EntityFieldSelectorComponentConfig {
  readonly kind: "entity-field-selector";
  readonly fieldPath: string;
  readonly layout: EntityFieldSelectorLayout;
  readonly enableSearch?: boolean;
  readonly cardsPerRow?: number;
  readonly imageFieldPath?: string;
  readonly styles?: readonly StyleRule[];
}

export interface FormSectionComponentConfig {
  readonly kind: "form-section";
  readonly title?: string;
  readonly styles?: readonly StyleRule[];
}

export interface FormActionsComponentConfig {
  readonly kind: "form-actions";
  readonly styles?: readonly StyleRule[];
}

export interface WizardProgressComponentConfig {
  readonly kind: "wizard-progress";
  readonly conditionalStyles?: readonly ConditionalStyleRule[];
  readonly styles?: readonly StyleRule[];
}

export interface WizardStepHostComponentConfig {
  readonly kind: "wizard-step-host";
  readonly styles?: readonly StyleRule[];
}

export interface WizardActionsComponentConfig {
  readonly kind: "wizard-actions";
  readonly nextLabel?: string;
  readonly backLabel?: string;
  readonly cancelLabel?: string;
  readonly submitCreateLabel?: string;
  readonly submitEditLabel?: string;
  readonly styles?: readonly StyleRule[];
}

export interface RelatedRecordsComponentConfig {
  readonly kind: "related-records";
  readonly childEntity: string;
  readonly foreignKeyField: string;
  readonly styles?: readonly StyleRule[];
}

export interface PageHeaderComponentConfig {
  readonly kind: "page-header";
  readonly styles?: readonly StyleRule[];
}

export interface PageToolbarComponentConfig {
  readonly kind: "page-toolbar";
  readonly styles?: readonly StyleRule[];
}

export interface PageMetricsComponentConfig {
  readonly kind: "page-metrics";
  readonly styles?: readonly StyleRule[];
}

export interface PageListComponentConfig {
  readonly kind: "page-list";
  readonly styles?: readonly StyleRule[];
}

export type PageUiComponentConfig =
  | PageHeaderComponentConfig
  | PageToolbarComponentConfig
  | PageMetricsComponentConfig
  | PageListComponentConfig;

export type UiComponentConfig =
  | FieldUiComponentConfig
  | MetricKpiComponentConfig
  | FormFieldComponentConfig
  | EntityFieldSelectorComponentConfig
  | FormSectionComponentConfig
  | FormActionsComponentConfig
  | WizardProgressComponentConfig
  | WizardStepHostComponentConfig
  | WizardActionsComponentConfig
  | RelatedRecordsComponentConfig
  | PageUiComponentConfig;

export function isWizardUiComponent(
  config: UiComponentConfig,
): config is
  | WizardProgressComponentConfig
  | WizardStepHostComponentConfig
  | WizardActionsComponentConfig {
  return (
    config.kind === "wizard-progress" ||
    config.kind === "wizard-step-host" ||
    config.kind === "wizard-actions"
  );
}

export function isPageUiComponent(
  config: UiComponentConfig,
): config is PageUiComponentConfig {
  return (
    config.kind === "page-header" ||
    config.kind === "page-toolbar" ||
    config.kind === "page-metrics" ||
    config.kind === "page-list"
  );
}

export function isMetricKpiComponent(
  config: UiComponentConfig,
): config is MetricKpiComponentConfig {
  return config.kind === "metric-kpi";
}

export function isFieldUiComponent(
  config: UiComponentConfig,
): config is FieldUiComponentConfig {
  return (
    config.kind === "text" ||
    config.kind === "image" ||
    config.kind === "date" ||
    config.kind === "numeric" ||
    config.kind === "badge"
  );
}

export function isEntityFieldSelectorComponent(
  config: UiComponentConfig,
): config is EntityFieldSelectorComponentConfig {
  return config.kind === "entity-field-selector";
}
