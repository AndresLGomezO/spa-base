export type CustomViewListSort =
  | "nameAsc"
  | "nameDesc"
  | "entity"
  | "updatedDesc";

export type CustomViewStatusFilter = "ACTIVE" | "PAUSED";

export const DEFAULT_CUSTOM_VIEW_LIST_SORT: CustomViewListSort = "nameAsc";

export const CUSTOM_VIEW_STATUS_FILTERS: readonly CustomViewStatusFilter[] = [
  "ACTIVE",
  "PAUSED",
];

export const CUSTOM_VIEW_LIST_ROW_HOVER_CLASS = "hover:bg-muted/50";
export const CUSTOM_VIEW_LIST_ROW_SELECTED_CLASS =
  "bg-primary/10 hover:bg-primary/15 ring-primary ring-2 ring-inset";

export const CUSTOM_VIEW_STATUS_BADGE_CLASS: Record<
  CustomViewStatusFilter,
  string
> = {
  ACTIVE: "bg-badge-success text-badge-success-foreground",
  PAUSED: "bg-badge-default text-badge-default-foreground",
};

export function isCustomViewListSort(
  value: string,
): value is CustomViewListSort {
  return (
    value === "nameAsc" ||
    value === "nameDesc" ||
    value === "entity" ||
    value === "updatedDesc"
  );
}

export function customViewStatusLabelKey(
  status: CustomViewStatusFilter,
): `customViews.list.status${"Active" | "Paused"}` {
  return status === "ACTIVE"
    ? "customViews.list.statusActive"
    : "customViews.list.statusPaused";
}

export function customViewSortLabelKey(
  sort: CustomViewListSort,
): `customViews.list.sort${"NameAsc" | "NameDesc" | "Entity" | "UpdatedDesc"}` {
  switch (sort) {
    case "nameDesc":
      return "customViews.list.sortNameDesc";
    case "entity":
      return "customViews.list.sortEntity";
    case "updatedDesc":
      return "customViews.list.sortUpdatedDesc";
    case "nameAsc":
    default:
      return "customViews.list.sortNameAsc";
  }
}
