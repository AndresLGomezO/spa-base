import type { ChartDataSource, ChartType } from "@repo/ui-builder-core";

export type ChartListSort =
  | "nameAsc"
  | "nameDesc"
  | "updatedDesc"
  | "dataSource"
  | "chartType";

export type ChartDataSourceFilter = ChartDataSource["type"];

export type ChartDisplayModeFilter = "inline" | "overlay";

export type ChartTypeFilter = ChartType;

export type ChartStatusFilter = "ACTIVE" | "PAUSED";

export const DEFAULT_CHART_LIST_SORT: ChartListSort = "nameAsc";

export const CHART_DATA_SOURCE_FILTERS: readonly ChartDataSourceFilter[] = [
  "static",
  "metricSeries",
  "entityQuery",
];

export const CHART_TYPE_FILTERS: readonly ChartTypeFilter[] = ["line", "area"];

export const CHART_DISPLAY_MODE_FILTERS: readonly ChartDisplayModeFilter[] = [
  "inline",
  "overlay",
];

export const CHART_STATUS_FILTERS: readonly ChartStatusFilter[] = [
  "ACTIVE",
  "PAUSED",
];

export const CHART_LIST_ROW_HOVER_CLASS = "hover:bg-muted/50";
export const CHART_LIST_ROW_SELECTED_CLASS =
  "bg-primary/10 hover:bg-primary/15 ring-primary ring-2 ring-inset";

export function isChartListSort(value: string): value is ChartListSort {
  return (
    value === "nameAsc" ||
    value === "nameDesc" ||
    value === "updatedDesc" ||
    value === "dataSource" ||
    value === "chartType"
  );
}

export function chartDataSourceLabelKey(
  dataSource: ChartDataSourceFilter,
): `charts.workbench.list.dataSource${"Static" | "MetricSeries" | "EntityQuery"}` {
  switch (dataSource) {
    case "static":
      return "charts.workbench.list.dataSourceStatic";
    case "metricSeries":
      return "charts.workbench.list.dataSourceMetricSeries";
    case "entityQuery":
    default:
      return "charts.workbench.list.dataSourceEntityQuery";
  }
}

export function chartTypeLabelKey(
  chartType: ChartTypeFilter,
): `charts.workbench.list.chartType${"Line" | "Area"}` {
  return chartType === "line"
    ? "charts.workbench.list.chartTypeLine"
    : "charts.workbench.list.chartTypeArea";
}

export function chartDisplayModeLabelKey(
  displayMode: ChartDisplayModeFilter,
): `charts.workbench.list.displayMode${"Inline" | "Overlay"}` {
  return displayMode === "inline"
    ? "charts.workbench.list.displayModeInline"
    : "charts.workbench.list.displayModeOverlay";
}

export function chartStatusLabelKey(
  status: ChartStatusFilter,
): `charts.statusValues.${"ACTIVE" | "PAUSED"}` {
  return `charts.statusValues.${status}`;
}

export function chartSortLabelKey(
  sort: ChartListSort,
):
  | `charts.workbench.list.sort${"NameAsc" | "NameDesc" | "UpdatedDesc" | "DataSource" | "ChartType"}`
  | "charts.workbench.list.sortNameAsc" {
  switch (sort) {
    case "nameDesc":
      return "charts.workbench.list.sortNameDesc";
    case "updatedDesc":
      return "charts.workbench.list.sortUpdatedDesc";
    case "dataSource":
      return "charts.workbench.list.sortDataSource";
    case "chartType":
      return "charts.workbench.list.sortChartType";
    case "nameAsc":
    default:
      return "charts.workbench.list.sortNameAsc";
  }
}
