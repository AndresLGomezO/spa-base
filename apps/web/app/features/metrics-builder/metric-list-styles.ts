export type MetricListSort =
  | "nameAsc"
  | "nameDesc"
  | "sourceModel"
  | "mode"
  | "updatedDesc";

export type MetricSourceTypeFilter = "entity" | "query";

export type MetricModeFilter = "aggregated" | "computed";

export type MetricStatusFilter = "ACTIVE" | "PAUSED";

export const DEFAULT_METRIC_LIST_SORT: MetricListSort = "nameAsc";

export const METRIC_SOURCE_TYPE_FILTERS: readonly MetricSourceTypeFilter[] = [
  "entity",
  "query",
];

export const METRIC_MODE_FILTERS: readonly MetricModeFilter[] = [
  "aggregated",
  "computed",
];

export const METRIC_STATUS_FILTERS: readonly MetricStatusFilter[] = [
  "ACTIVE",
  "PAUSED",
];

export const METRIC_LIST_ROW_HOVER_CLASS = "hover:bg-muted/50";
export const METRIC_LIST_ROW_SELECTED_CLASS =
  "bg-primary/10 hover:bg-primary/15 ring-primary ring-2 ring-inset";

export const METRIC_SOURCE_TYPE_BADGE_CLASS: Record<
  MetricSourceTypeFilter,
  string
> = {
  entity: "bg-badge-info text-badge-info-foreground",
  query: "bg-badge-default text-badge-default-foreground",
};

export const METRIC_MODE_BADGE_CLASS: Record<MetricModeFilter, string> = {
  aggregated: "bg-badge-default text-badge-default-foreground",
  computed: "bg-badge-info text-badge-info-foreground",
};

export const METRIC_STATUS_BADGE_CLASS: Record<MetricStatusFilter, string> = {
  ACTIVE: "bg-badge-success text-badge-success-foreground",
  PAUSED: "bg-badge-default text-badge-default-foreground",
};

export function isMetricListSort(value: string): value is MetricListSort {
  return (
    value === "nameAsc" ||
    value === "nameDesc" ||
    value === "sourceModel" ||
    value === "mode" ||
    value === "updatedDesc"
  );
}

export function metricSourceTypeLabelKey(
  sourceType: MetricSourceTypeFilter,
): `metrics.workbench.list.sourceType${"Entity" | "Query"}` {
  return sourceType === "entity"
    ? "metrics.workbench.list.sourceTypeEntity"
    : "metrics.workbench.list.sourceTypeQuery";
}

export function metricModeLabelKey(
  mode: MetricModeFilter,
): `metrics.workbench.list.mode${"Aggregated" | "Computed"}` {
  return mode === "aggregated"
    ? "metrics.workbench.list.modeAggregated"
    : "metrics.workbench.list.modeComputed";
}

export function metricStatusLabelKey(
  status: MetricStatusFilter,
): `metrics.statusValues.${"ACTIVE" | "PAUSED"}` {
  return `metrics.statusValues.${status}`;
}

export function metricSortLabelKey(
  sort: MetricListSort,
):
  | `metrics.workbench.list.sort${"NameAsc" | "NameDesc" | "SourceModel" | "Mode" | "UpdatedDesc"}`
  | "metrics.workbench.list.sortNameAsc" {
  switch (sort) {
    case "nameDesc":
      return "metrics.workbench.list.sortNameDesc";
    case "sourceModel":
      return "metrics.workbench.list.sortSourceModel";
    case "mode":
      return "metrics.workbench.list.sortMode";
    case "updatedDesc":
      return "metrics.workbench.list.sortUpdatedDesc";
    case "nameAsc":
    default:
      return "metrics.workbench.list.sortNameAsc";
  }
}
