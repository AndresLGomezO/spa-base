import type { EntityFileReference } from "../schema/entityFileReference.js";
import type {
  ResponsiveGridBreakpoint,
  UiLayoutDocument,
} from "@repo/ui-builder-core";
import type {
  EntityUiOverrideForms,
  FormModalChrome,
  FormPresentation,
  WizardFormConfig,
  WizardStepConfig,
  WizardStepStatus,
} from "./form-config.js";
import type { MetricWidgetDefinition } from "./metric-widget-types.js";
export type FieldComponentType =
  | "input"
  | "number"
  | "toggle"
  | "date"
  | "relation"
  | "select"
  | "image"
  | "document";

export type FieldDisplayFormat = "currency" | "plain" | "percentage";

export type FieldDateDisplayFormat = "date" | "datetime" | "time";

export interface FieldUIConfig {
  readonly label?: string;
  readonly component?: FieldComponentType;
  readonly displayFormat?: FieldDisplayFormat;
  readonly dateDisplayFormat?: FieldDateDisplayFormat;
  readonly order?: number;
  readonly placeholder?: string;
  readonly visible?: boolean;
  readonly editable?: boolean;
  readonly filterable?: boolean;
  readonly sortable?: boolean;
  readonly searchable?: boolean;
}

export type FilterOperatorUI = "==" | "!=" | "<" | "<=" | ">" | ">=" | "in";

export interface FilterUIConfig {
  readonly field: string;
  readonly operator?: FilterOperatorUI;
  readonly label?: string;
}

export interface ViewConfigBase {
  readonly name: string;
  readonly fields: readonly string[];
  readonly filters?: readonly FilterUIConfig[];
  readonly defaultSort?: {
    readonly field: string;
    readonly direction: "asc" | "desc";
  };
}

export interface GroupedTableColumn {
  readonly id: string;
  readonly label?: string;
  readonly displayFrom?: ResponsiveGridBreakpoint;
  readonly displayTo?: ResponsiveGridBreakpoint;
  readonly cellLayout: UiLayoutDocument;
}

export interface TableViewConfig extends ViewConfigBase {
  readonly type: "table";
  /** Show row actions column (view/edit/share/delete). Default true when omitted. */
  readonly showActions?: boolean;
}

export interface CardViewConfig extends ViewConfigBase {
  readonly type: "card";
  readonly layout?: UiLayoutDocument;
}

export interface ExpandableTableViewConfig extends ViewConfigBase {
  readonly type: "expandableTable";
  readonly columns: readonly GroupedTableColumn[];
  readonly rowExpandLayout: UiLayoutDocument;
  readonly showActions?: boolean;
}

export type ViewConfig =
  | TableViewConfig
  | CardViewConfig
  | ExpandableTableViewConfig;

export function isTableViewConfig(view: ViewConfig): view is TableViewConfig {
  return view.type === "table";
}

export function isCardViewConfig(view: ViewConfig): view is CardViewConfig {
  return view.type === "card";
}

export function isExpandableTableViewConfig(
  view: ViewConfig,
): view is ExpandableTableViewConfig {
  return view.type === "expandableTable";
}

export type {
  EntityUiOverrideForms,
  FormPresentation,
  WizardFormConfig,
  WizardStepConfig,
  WizardStepStatus,
};

export type { MetricWidgetDefinition } from "./metric-widget-types.js";

export interface EntityUiOverride {
  readonly entityName: string;
  readonly views: readonly ViewConfig[];
  readonly listViewType?: EntityListViewType;
  readonly listItem?: UiLayoutDocument;
  readonly mainPage?: UiLayoutDocument;
  readonly recordDetail?: UiLayoutDocument;
  /** @deprecated Use recordDetail; read-only alias for migration */
  readonly detail?: UiLayoutDocument;
  readonly metricWidgets?: readonly MetricWidgetDefinition[];
  readonly metricRowLayout?: UiLayoutDocument;
  readonly forms?: EntityUiOverrideForms;
  readonly updatedAt: string;
}

export type EntityUiOverrideRecord = EntityUiOverride;

export interface FormSection {
  readonly title?: string;
  readonly fields: readonly string[];
}

export interface FormLayout {
  readonly layout?: UiLayoutDocument;
  /** Legacy section-based shape; migrated to `layout` at read time. */
  readonly sections?: readonly FormSection[];
}

export type FormModalSize = "sm" | "md" | "lg" | "xl" | "2xl";

export type FormModalSizeByBreakpoint = Partial<
  Record<
    import("@repo/ui-builder-core").ResponsiveGridBreakpoint,
    FormModalSize
  >
>;

export interface FormConfig {
  readonly create: FormLayout;
  readonly edit: FormLayout;
  readonly presentation?: FormPresentation;
  readonly wizard?: WizardFormConfig;
  readonly modalSize?: FormModalSize;
  readonly modalSizeByBreakpoint?: FormModalSizeByBreakpoint;
  readonly modalChrome?: FormModalChrome;
  readonly modalFooterLayout?: UiLayoutDocument;
}

export interface DetailConfig {
  readonly fields: readonly string[];
}

export interface EntityNavConfig {
  readonly label: string;
  readonly icon?: string;
}

export type EntityListViewType = "table" | "card" | "expandableTable";

/** @deprecated Use expandableTable */
export type LegacyEntityListViewType = EntityListViewType | "compact";

export interface EntityUIConfig {
  readonly views: readonly ViewConfig[];
  readonly listViewType?: EntityListViewType;
  /** Canonical per-record list item layout (override or migrated from card view). */
  readonly listItem?: UiLayoutDocument;
  /** Designed entity main list page layout (`/app/:entity`). */
  readonly mainPageLayout?: UiLayoutDocument;
  /** Designed single-record detail page layout (`/app/:entity/:id`). */
  readonly recordDetailLayout?: UiLayoutDocument;
  /**
   * @deprecated Use recordDetailLayout
   */
  readonly detailLayout?: UiLayoutDocument;
  readonly forms: FormConfig;
  readonly detail?: DetailConfig;
  readonly nav?: EntityNavConfig;
  readonly fields?: Readonly<Record<string, FieldUIConfig>>;
  /** Reusable metric widget layouts for metrics row composition. */
  readonly metricWidgets?: readonly MetricWidgetDefinition[];
  /** Designed metrics row layout (entity-level strip composition). */
  readonly metricRowLayout?: UiLayoutDocument;
}

export interface SerializableFieldMeta {
  readonly type: string;
  readonly required: boolean;
  readonly optional: boolean;
  readonly isArray?: boolean;
  readonly default?: string | number | boolean;
  readonly relation?: {
    readonly target: string;
    readonly type: string;
    readonly onDelete?: string;
    readonly joinCollection?: string;
  };
  readonly enumValues?: readonly string[];
  readonly sensitive?: boolean;
  readonly numberKind?: "integer" | "decimal";
  readonly maxSizeBytes?: number;
  readonly defaultImage?: EntityFileReference & {
    readonly downloadUrl?: string;
  };
}

export type FieldAccessLevel = "read" | "write" | "none";

export interface SerializableEntityDefinition {
  readonly name: string;
  readonly collection: string;
  readonly permissions: readonly string[];
  readonly fields: Readonly<Record<string, SerializableFieldMeta>>;
  readonly ui: EntityUIConfig;
  readonly fieldAccess?: Readonly<Record<string, FieldAccessLevel>>;
  readonly displayField?: string;
  readonly hiddenFromNav?: boolean;
  readonly navCategoryId?: string;
  readonly navOrder?: number;
}
