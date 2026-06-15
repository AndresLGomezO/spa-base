/**
 * @ai-context-sync
 * When changing component kinds or props, run: pnpm generate:ai-context
 * Affected fragments: ui.components.*
 */
import type { StyleRule } from "../styles/style-types.js";
import type { RowNode, ColumnStackDirection } from "./layout.js";
import type { ConditionalStyleRule, LabelConfig } from "./styling.js";

export type UiComponentKind =
  | "container"
  | "text"
  | "image"
  | "icon"
  | "user"
  | "date"
  | "numeric"
  | "badge"
  | "metric-kpi"
  | "metric-widget"
  | "dashboard-section"
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

export interface MetricWidgetComponentConfig {
  readonly kind: "metric-widget";
  readonly entityName: string;
  readonly widgetId: string;
  readonly label?: string;
  readonly styles?: readonly StyleRule[];
}

export interface DashboardSectionComponentConfig {
  readonly kind: "dashboard-section";
  readonly sectionId: string;
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

export interface IconComponentConfig {
  readonly kind: "icon";
  readonly iconName: string;
  readonly iconSize?: number;
  readonly label?: LabelConfig;
  readonly styles?: readonly StyleRule[];
}

export type UserDisplayMode = "name" | "email" | "photo" | "photo-and-name";

export type UserNameFormat = "full" | "first";

export interface UserComponentConfig {
  readonly kind: "user";
  readonly display: UserDisplayMode;
  readonly nameFormat?: UserNameFormat;
  readonly imageSize?: number;
  readonly label?: LabelConfig;
  readonly styles?: readonly StyleRule[];
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
  readonly hideLabel?: boolean;
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

export type WizardProgressVariant = "steps" | "bar" | "stepper";

export type WizardStepLabelPosition =
  | "top"
  | "bottom"
  | "left"
  | "right"
  | "hidden";

export interface WizardStepLabelConfig {
  readonly show?: boolean;
  readonly position?: WizardStepLabelPosition;
  readonly bold?: boolean;
  readonly thin?: boolean;
  readonly italic?: boolean;
  readonly underline?: boolean;
  readonly color?: string;
  readonly align?: "left" | "center" | "right";
  readonly fontSize?: number;
}

export interface WizardProgressComponentConfig {
  readonly kind: "wizard-progress";
  readonly variant?: WizardProgressVariant;
  readonly stepLabel?: WizardStepLabelConfig;
  readonly barTrackColor?: string;
  readonly barFillColor?: string;
  /** Stepper: minimum connector width between steps in px. Default 16. */
  readonly stepSpacing?: number;
  /** Stepper: step circle diameter in px. Default 32. */
  readonly circleSize?: number;
  /** Stepper: max width of each step label container in px. */
  readonly labelMaxWidth?: number;
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

export interface ContainerComponentConfig {
  readonly kind: "container";
  readonly rows: readonly RowNode[];
  /** Vertical (default) or horizontal stacking of child rows. */
  readonly stackDirection?: ColumnStackDirection;
  readonly styles?: readonly StyleRule[];
}

export type PageUiComponentConfig =
  | PageHeaderComponentConfig
  | PageToolbarComponentConfig
  | PageMetricsComponentConfig
  | PageListComponentConfig;

export type UiComponentConfig =
  | ContainerComponentConfig
  | FieldUiComponentConfig
  | IconComponentConfig
  | UserComponentConfig
  | MetricKpiComponentConfig
  | MetricWidgetComponentConfig
  | DashboardSectionComponentConfig
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

export function isMetricWidgetComponent(
  config: UiComponentConfig,
): config is MetricWidgetComponentConfig {
  return config.kind === "metric-widget";
}

export function isDashboardSectionComponent(
  config: UiComponentConfig,
): config is DashboardSectionComponentConfig {
  return config.kind === "dashboard-section";
}

export function isIconComponent(
  config: UiComponentConfig,
): config is IconComponentConfig {
  return config.kind === "icon";
}

export function isUserComponent(
  config: UiComponentConfig,
): config is UserComponentConfig {
  return config.kind === "user";
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

export function isContainerComponent(
  config: UiComponentConfig,
): config is ContainerComponentConfig {
  return config.kind === "container";
}
