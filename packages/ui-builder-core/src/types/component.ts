/**
 * @ai-context-sync
 * When changing component kinds or props, run: pnpm generate:ai-context
 * Also update docs/ui-design-manual/03-components/ for the affected kind.
 * Affected fragments: ui.components.*
 */
import type { StyleRule } from "../styles/style-types.js";
import type { RowNode, ColumnStackDirection, LayoutAlign } from "./layout.js";
import type { ConditionalStyleRule, LabelConfig } from "./styling.js";

export type UiComponentKind =
  | "container"
  | "grid"
  | "text"
  | "image"
  | "icon"
  | "user"
  | "notification-bell"
  | "date"
  | "numeric"
  | "badge"
  | "metric-kpi"
  | "metric-derived-kpi"
  | "metric-widget"
  | "query-viewer"
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
  | "page-list"
  | "view-search"
  | "view-filters"
  | "view-date-filter"
  | "chart";

export type WizardStepStatusKind =
  | "pending"
  | "active"
  | "completed"
  | "invalid";

export type DataSource =
  | { readonly type: "field"; readonly path: string }
  | { readonly type: "static"; readonly value: string };

export type FieldDateDisplayFormat =
  | "date"
  | "datetime"
  | "time"
  | "daysRemaining";

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
  | {
      readonly type: "static";
      readonly value: string | number | boolean | readonly string[];
    }
  | { readonly type: "entityField"; readonly fieldPath: string }
  | { readonly type: "listFilter"; readonly field: string }
  | { readonly type: "routeParam"; readonly param: string }
  | { readonly type: "dashboardDateFilter" }
  | {
      readonly type: "relativePeriod";
      readonly field: string;
      readonly anchor:
        | "dashboardDateFilter"
        | "listFilter"
        | "routeParam"
        | "now";
      readonly offset: number;
      readonly unit: "day" | "month" | "year";
      readonly anchorField?: string;
      readonly anchorParam?: string;
    };

/** Alias used for metric and query parameter bindings. */
export type FilterBindingSource = MetricBindingSource;

export type RelativePeriodAnchor = Extract<
  MetricBindingSource,
  { type: "relativePeriod" }
>["anchor"];

export type RelativePeriodUnit = Extract<
  MetricBindingSource,
  { type: "relativePeriod" }
>["unit"];

export interface MetricKpiComponentConfig {
  readonly kind: "metric-kpi";
  readonly metricDefinitionId: string;
  readonly groupBindings: Readonly<Record<string, MetricBindingSource>>;
  readonly dimensionBindings: Readonly<Record<string, MetricBindingSource>>;
  readonly parameterBindings?: Readonly<Record<string, MetricBindingSource>>;
  readonly queryParameterBindings?: Readonly<
    Record<string, MetricBindingSource>
  >;
  readonly label?: string;
  readonly styles?: readonly StyleRule[];
  readonly conditionalStyles?: readonly ConditionalStyleRule[];
  /** When true, colors the value from its sign (see `tonePolarity`). */
  readonly showToneColors?: boolean;
  /** `normal`: positive = success, negative = danger. `inverted`: positive = danger, negative = success. */
  readonly tonePolarity?: "normal" | "inverted";
}

export interface MetricDerivedTerm {
  readonly metricDefinitionId: string;
  readonly multiplier: number;
}

export type MetricDerivedOperator = "+" | "-" | "*" | "/";

export type MetricDerivedExpressionToken =
  | { readonly type: "metric"; readonly metricDefinitionId: string }
  | { readonly type: "constant"; readonly value: number }
  | { readonly type: "operator"; readonly op: MetricDerivedOperator }
  | { readonly type: "paren"; readonly side: "open" | "close" };

export interface MetricDerivedKpiComponentConfig {
  readonly kind: "metric-derived-kpi";
  readonly label?: string;
  readonly expression: readonly MetricDerivedExpressionToken[];
  /** @deprecated Legacy weighted-sum terms; migrated to `expression` on read. */
  readonly terms?: readonly MetricDerivedTerm[];
  readonly groupBindings: Readonly<Record<string, MetricBindingSource>>;
  readonly dimensionBindings: Readonly<Record<string, MetricBindingSource>>;
  readonly queryParameterBindings?: Readonly<
    Record<string, MetricBindingSource>
  >;
  readonly styles?: readonly StyleRule[];
  readonly conditionalStyles?: readonly ConditionalStyleRule[];
}

export interface MetricWidgetComponentConfig {
  readonly kind: "metric-widget";
  readonly entityName: string;
  readonly widgetId: string;
  readonly label?: string;
  readonly styles?: readonly StyleRule[];
  readonly conditionalStyles?: readonly ConditionalStyleRule[];
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
  readonly displayMode?: "inline" | "overlay";
  readonly objectFit?: "contain" | "cover" | "fill";
}

export type ChartType = "line" | "area" | "donut";

export interface ChartPoint {
  readonly x: string | number;
  readonly y: number;
  readonly seriesId?: string;
}

export type ChartSeriesStepUnit = "day" | "month" | "year";

export interface ChartMetricSeriesStep {
  readonly unit: ChartSeriesStepUnit;
  readonly offsetStart: number;
  readonly offsetEnd: number;
}

export type ChartEntityQueryAggregate = "sum" | "count";

export interface ChartEntityQueryRowFilter {
  readonly whenField: string;
  readonly whenOperator: "==" | "in";
  readonly whenValue: string | readonly string[];
}

export interface ChartEntityQueryValueTransform {
  readonly whenField: string;
  readonly whenOperator: "==" | "in";
  readonly whenValue: string | readonly string[];
  readonly multiplier: number;
}

export type ChartEntityQueryTimeSeriesLayout =
  | "span"
  | "monthToDateRightAligned";

export interface ChartEntityQueryTimeSeries {
  readonly periodParameter: string;
  readonly bucketCount: number;
  readonly step: ChartMetricSeriesStep;
  readonly aggregate: ChartEntityQueryAggregate;
  readonly layout?: ChartEntityQueryTimeSeriesLayout;
  readonly rowFilters?: readonly ChartEntityQueryRowFilter[];
  readonly valueTransforms?: readonly ChartEntityQueryValueTransform[];
}

export type ChartDataSource =
  | { readonly type: "static"; readonly points: readonly ChartPoint[] }
  | {
      readonly type: "metricSeries";
      readonly metricDefinitionId: string;
      readonly dimensionField: string;
      readonly bucketCount: number;
      readonly step: ChartMetricSeriesStep;
      readonly groupBindings?: Readonly<Record<string, MetricBindingSource>>;
      readonly dimensionBindings?: Readonly<
        Record<string, MetricBindingSource>
      >;
      readonly parameterBindings?: Readonly<
        Record<string, MetricBindingSource>
      >;
    }
  | {
      readonly type: "entityQuery";
      readonly entityQueryDefinitionId: string;
      readonly xFieldPath: string;
      readonly yFieldPath: string;
      readonly seriesFieldPath?: string;
      readonly parameterBindings?: Readonly<
        Record<string, MetricBindingSource>
      >;
      readonly timeSeries?: ChartEntityQueryTimeSeries;
    }
  | {
      readonly type: "metricValue";
      readonly metricDefinitionId: string;
      readonly maxValue?: number;
      readonly groupBindings?: Readonly<Record<string, MetricBindingSource>>;
      readonly dimensionBindings?: Readonly<
        Record<string, MetricBindingSource>
      >;
      readonly parameterBindings?: Readonly<
        Record<string, MetricBindingSource>
      >;
    };

export type ChartLegendPosition = "top" | "bottom" | "left" | "right" | "none";

export type ChartLegendAlign = "start" | "center" | "end";

export interface ChartLegendConfig {
  readonly visible?: boolean;
  readonly position?: ChartLegendPosition;
  readonly align?: ChartLegendAlign;
  readonly fontSize?: number;
  readonly fontWeight?: "normal" | "medium" | "semibold" | "bold";
}

export interface ChartAxisConfig {
  readonly visible?: boolean;
  readonly label?: string;
  readonly showTicks?: boolean;
}

export interface ChartGridConfig {
  readonly visible?: boolean;
}

export interface ChartSeriesStyle {
  readonly id: string;
  readonly label?: string;
  readonly color?: string;
  readonly strokeWidth?: number;
  readonly showAreaFill?: boolean;
  readonly areaFillColor?: string;
  readonly areaFillOpacity?: number;
}

export interface ChartAnimationConfig {
  readonly enabled?: boolean;
  readonly durationMs?: number;
}

export interface ChartDonutConfig {
  readonly innerRadiusRatio?: number;
  readonly trackColor?: string;
  readonly fillColor?: string;
  readonly showCenterLabel?: boolean;
  readonly strokeWidth?: number;
}

/** Full chart recipe stored in the Charts catalog (not layout instance fields). */
export interface ChartDefinitionRecipe {
  readonly chartType: ChartType;
  readonly displayMode?: "inline" | "overlay";
  readonly dataSource: ChartDataSource;
  readonly series?: readonly ChartSeriesStyle[];
  readonly xAxis?: ChartAxisConfig;
  readonly yAxis?: ChartAxisConfig;
  readonly legend?: ChartLegendConfig;
  readonly grid?: ChartGridConfig;
  readonly animation?: ChartAnimationConfig;
  readonly donut?: ChartDonutConfig;
}

/** Merged config used at runtime after resolving a chart definition reference. */
export interface ResolvedChartComponentConfig extends ChartDefinitionRecipe {
  readonly kind: "chart";
  readonly chartDefinitionId: string;
  readonly ariaLabel?: string;
  readonly styles?: readonly StyleRule[];
}

export interface ChartComponentConfig {
  readonly kind: "chart";
  readonly chartDefinitionId: string;
  readonly parameterBindings?: Readonly<Record<string, MetricBindingSource>>;
  readonly styles?: readonly StyleRule[];
  readonly conditionalStyles?: readonly ConditionalStyleRule[];
  readonly ariaLabel?: string;
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
  readonly conditionalStyles?: readonly ConditionalStyleRule[];
}

export type UserDisplayMode =
  | "name"
  | "email"
  | "photo"
  | "photo-and-name"
  | "profile-button";

export type UserNameFormat = "full" | "first";

export type UserAvatarShape = "circle" | "rounded" | "square";

export type UserProfileButtonContent = "photo" | "full";

export interface NotificationBellComponentConfig {
  readonly kind: "notification-bell";
  readonly iconName?: string;
  readonly iconSize?: number;
  readonly showBadge?: boolean;
  readonly label?: LabelConfig;
  readonly styles?: readonly StyleRule[];
  readonly conditionalStyles?: readonly ConditionalStyleRule[];
}

export interface UserComponentConfig {
  readonly kind: "user";
  readonly display: UserDisplayMode;
  readonly nameFormat?: UserNameFormat;
  readonly imageSize?: number;
  readonly avatarShape?: UserAvatarShape;
  readonly profileButtonContent?: UserProfileButtonContent;
  readonly label?: LabelConfig;
  readonly styles?: readonly StyleRule[];
  readonly conditionalStyles?: readonly ConditionalStyleRule[];
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
  readonly hidden?: boolean;
  readonly booleanDisplay?: BooleanFieldDisplay;
  readonly switchVariant?: SwitchVariant;
  readonly switchWidth?: number;
  readonly switchHeight?: number;
  readonly multiline?: boolean;
  readonly multilineRows?: number;
  readonly styles?: readonly StyleRule[];
  readonly conditionalStyles?: readonly ConditionalStyleRule[];
}

export type EntityFieldSelectorLayout =
  | "list"
  | "list-with-logo"
  | "mini-cards";

export interface EntityFieldSelectorComponentConfig {
  readonly kind: "entity-field-selector";
  readonly fieldPath: string;
  readonly layout: EntityFieldSelectorLayout;
  readonly hidden?: boolean;
  readonly enableSearch?: boolean;
  readonly cardsPerRow?: number;
  readonly imageFieldPath?: string;
  readonly styles?: readonly StyleRule[];
  readonly conditionalStyles?: readonly ConditionalStyleRule[];
}

export interface FormSectionComponentConfig {
  readonly kind: "form-section";
  readonly title?: string;
  readonly styles?: readonly StyleRule[];
  readonly conditionalStyles?: readonly ConditionalStyleRule[];
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
  readonly conditionalStyles?: readonly ConditionalStyleRule[];
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

export interface ViewFilterEntry {
  readonly entityName: string;
  readonly fieldName: string;
}

export type ViewFilterDateGranularity = "year" | "month" | "day";

export interface ViewSearchComponentConfig {
  readonly kind: "view-search";
  readonly placeholder?: string;
  readonly label?: LabelConfig;
  readonly styles?: readonly StyleRule[];
}

export interface ViewFiltersComponentConfig {
  readonly kind: "view-filters";
  readonly filters: readonly ViewFilterEntry[];
  readonly label?: LabelConfig;
  readonly styles?: readonly StyleRule[];
}

export interface ViewDateFilterComponentConfig {
  readonly kind: "view-date-filter";
  readonly dateFilterGranularity?: ViewFilterDateGranularity;
  readonly dateFilterParam?: string;
  readonly label?: LabelConfig;
  readonly styles?: readonly StyleRule[];
}

export interface ContainerComponentConfig {
  readonly kind: "container";
  /** @deprecated Layout children — migrate to nested `grid` component. Neutral containers have no rows. */
  readonly rows: readonly RowNode[];
  /** @deprecated Use `grid` component for layout structure. */
  readonly stackDirection?: ColumnStackDirection;
  readonly styles?: readonly StyleRule[];
  readonly conditionalStyles?: readonly ConditionalStyleRule[];
}

/** Grid is the only layout structural primitive (Section 15.1). */
export interface GridComponentConfig {
  readonly kind: "grid";
  readonly gridTemplateColumns: string;
  readonly gap?: string;
  readonly alignItems?: LayoutAlign;
  readonly rows: readonly RowNode[];
  readonly styles?: readonly StyleRule[];
  readonly conditionalStyles?: readonly ConditionalStyleRule[];
}

export interface QueryViewerComponentConfig {
  readonly kind: "query-viewer";
  readonly entityQueryDefinitionId: string;
  readonly parameterBindings?: Readonly<Record<string, MetricBindingSource>>;
  readonly rows: readonly RowNode[];
  /** Optional layout rendered when the query returns zero rows. */
  readonly emptyStateRows?: readonly RowNode[];
  /** Vertical (default) or horizontal stacking of result items. */
  readonly stackDirection?: ColumnStackDirection;
  readonly styles?: readonly StyleRule[];
  readonly conditionalStyles?: readonly ConditionalStyleRule[];
}

export type RowHolderComponentConfig =
  | ContainerComponentConfig
  | GridComponentConfig
  | QueryViewerComponentConfig;

export type PageUiComponentConfig =
  | PageHeaderComponentConfig
  | PageToolbarComponentConfig
  | PageMetricsComponentConfig
  | PageListComponentConfig;

export type ViewFilterUiComponentConfig =
  | ViewSearchComponentConfig
  | ViewFiltersComponentConfig
  | ViewDateFilterComponentConfig;

export type UiComponentConfig =
  | ContainerComponentConfig
  | GridComponentConfig
  | QueryViewerComponentConfig
  | FieldUiComponentConfig
  | ChartComponentConfig
  | IconComponentConfig
  | NotificationBellComponentConfig
  | UserComponentConfig
  | MetricKpiComponentConfig
  | MetricDerivedKpiComponentConfig
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
  | PageUiComponentConfig
  | ViewFilterUiComponentConfig;

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

export function isMetricDerivedKpiComponent(
  config: UiComponentConfig,
): config is MetricDerivedKpiComponentConfig {
  return config.kind === "metric-derived-kpi";
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

export function isViewSearchComponent(
  config: UiComponentConfig,
): config is ViewSearchComponentConfig {
  return config.kind === "view-search";
}

export function isViewFiltersComponent(
  config: UiComponentConfig,
): config is ViewFiltersComponentConfig {
  return config.kind === "view-filters";
}

export function isViewDateFilterComponent(
  config: UiComponentConfig,
): config is ViewDateFilterComponentConfig {
  return config.kind === "view-date-filter";
}

export function isIconComponent(
  config: UiComponentConfig,
): config is IconComponentConfig {
  return config.kind === "icon";
}

export function isNotificationBellComponent(
  config: UiComponentConfig,
): config is NotificationBellComponentConfig {
  return config.kind === "notification-bell";
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

export function isChartComponent(
  config: UiComponentConfig,
): config is ChartComponentConfig {
  return config.kind === "chart";
}

export function createDefaultChartComponent(): ChartComponentConfig {
  return {
    kind: "chart",
    chartDefinitionId: "",
  };
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

export function isGridComponent(
  config: UiComponentConfig,
): config is GridComponentConfig {
  return config.kind === "grid";
}

export function isQueryViewerComponent(
  config: UiComponentConfig,
): config is QueryViewerComponentConfig {
  return config.kind === "query-viewer";
}

export function isRowHolderComponent(
  config: UiComponentConfig,
): config is RowHolderComponentConfig {
  return (
    config.kind === "container" ||
    config.kind === "grid" ||
    config.kind === "query-viewer"
  );
}
