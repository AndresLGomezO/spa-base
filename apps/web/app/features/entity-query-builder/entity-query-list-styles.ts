export type EntityQueryListSort =
  | "nameAsc"
  | "nameDesc"
  | "sourceEntity"
  | "queryMode"
  | "updatedDesc";

export type EntityQueryStatusFilter = "ACTIVE" | "PAUSED";

export type EntityQueryModeFilter = "records" | "aggregated";

export const DEFAULT_ENTITY_QUERY_LIST_SORT: EntityQueryListSort = "nameAsc";

export const ENTITY_QUERY_STATUS_FILTERS: readonly EntityQueryStatusFilter[] = [
  "ACTIVE",
  "PAUSED",
];

export const ENTITY_QUERY_MODE_FILTERS: readonly EntityQueryModeFilter[] = [
  "records",
  "aggregated",
];

export const ENTITY_QUERY_LIST_ROW_HOVER_CLASS = "hover:bg-muted/50";
export const ENTITY_QUERY_LIST_ROW_SELECTED_CLASS =
  "bg-primary/10 hover:bg-primary/15 ring-primary ring-2 ring-inset";

export const ENTITY_QUERY_STATUS_BADGE_CLASS: Record<
  EntityQueryStatusFilter,
  string
> = {
  ACTIVE: "bg-badge-success text-badge-success-foreground",
  PAUSED: "bg-badge-default text-badge-default-foreground",
};

export const ENTITY_QUERY_MODE_BADGE_CLASS: Record<
  EntityQueryModeFilter,
  string
> = {
  records: "bg-badge-info text-badge-info-foreground",
  aggregated: "bg-badge-warning text-badge-warning-foreground",
};

export function isEntityQueryListSort(
  value: string,
): value is EntityQueryListSort {
  return (
    value === "nameAsc" ||
    value === "nameDesc" ||
    value === "sourceEntity" ||
    value === "queryMode" ||
    value === "updatedDesc"
  );
}

export function entityQueryStatusLabelKey(
  status: EntityQueryStatusFilter,
): `queryBuilder.statusValues.${EntityQueryStatusFilter}` {
  return `queryBuilder.statusValues.${status}`;
}

export function entityQueryModeLabelKey(
  mode: EntityQueryModeFilter,
): `queryBuilder.queryMode.${"records" | "aggregated"}` {
  return `queryBuilder.queryMode.${mode}`;
}

export function entityQuerySortLabelKey(
  sort: EntityQueryListSort,
):
  | "queryBuilder.list.sortNameAsc"
  | "queryBuilder.list.sortNameDesc"
  | "queryBuilder.list.sortSourceEntity"
  | "queryBuilder.list.sortQueryMode"
  | "queryBuilder.list.sortUpdatedDesc" {
  switch (sort) {
    case "nameDesc":
      return "queryBuilder.list.sortNameDesc";
    case "sourceEntity":
      return "queryBuilder.list.sortSourceEntity";
    case "queryMode":
      return "queryBuilder.list.sortQueryMode";
    case "updatedDesc":
      return "queryBuilder.list.sortUpdatedDesc";
    case "nameAsc":
    default:
      return "queryBuilder.list.sortNameAsc";
  }
}
