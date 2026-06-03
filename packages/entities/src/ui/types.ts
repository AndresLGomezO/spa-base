import type { EntityFileReference } from "../schema/entityFileReference.js";
import type { UiLayoutDocument } from "@repo/ui-builder-core";
import type { ViewMetricWidget } from "./metric-widget-types.js";

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

export interface ViewConfig {
  readonly type: "table" | "card";
  readonly name: string;
  readonly fields: readonly string[];
  readonly filters?: readonly FilterUIConfig[];
  readonly defaultSort?: {
    readonly field: string;
    readonly direction: "asc" | "desc";
  };
  readonly layout?: UiLayoutDocument;
  readonly metricWidgets?: readonly ViewMetricWidget[];
}

export interface EntityUiOverrideForms {
  readonly create?: UiLayoutDocument;
  readonly edit?: UiLayoutDocument;
}

export interface EntityUiOverride {
  readonly entityName: string;
  readonly views: readonly ViewConfig[];
  readonly listViewType?: EntityListViewType;
  readonly listItem?: UiLayoutDocument;
  readonly detail?: UiLayoutDocument;
  readonly forms?: EntityUiOverrideForms;
  readonly updatedAt: string;
}

export type EntityUiOverrideRecord = EntityUiOverride;

export interface FormSection {
  readonly title?: string;
  readonly fields: readonly string[];
}

/** @deprecated Prefer `forms.*.layout` (`UiLayoutDocument`) on entity UI overrides. */
export interface FormLayout {
  readonly sections: readonly FormSection[];
  /** Designed form layout (override); sections remain fallback metadata. */
  readonly layout?: UiLayoutDocument;
}

export interface FormConfig {
  readonly create: FormLayout;
  readonly edit: FormLayout;
}

export interface DetailConfig {
  readonly fields: readonly string[];
}

export interface EntityNavConfig {
  readonly label: string;
  readonly icon?: string;
}

export type EntityListViewType = "table" | "card" | "compact";

export interface EntityUIConfig {
  readonly views: readonly ViewConfig[];
  readonly listViewType?: EntityListViewType;
  /** Canonical per-record list item layout (override or migrated from card view). */
  readonly listItem?: UiLayoutDocument;
  /** Designed record detail page layout. */
  readonly detailLayout?: UiLayoutDocument;
  readonly forms: FormConfig;
  readonly detail?: DetailConfig;
  readonly nav?: EntityNavConfig;
  readonly fields?: Readonly<Record<string, FieldUIConfig>>;
}

export interface SerializableFieldMeta {
  readonly type: string;
  readonly required: boolean;
  readonly optional: boolean;
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
