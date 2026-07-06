export type DataHookListSort =
  | "nameAsc"
  | "nameDesc"
  | "entity"
  | "order"
  | "updatedDesc";

export type DataHookPhaseFilter = "before" | "after";

export type DataHookTriggerKindFilter = "crud" | "schedule";

export type DataHookStatusFilter = "enabled" | "disabled";

export const DEFAULT_DATA_HOOK_LIST_SORT: DataHookListSort = "order";

export const DATA_HOOK_PHASE_FILTERS: readonly DataHookPhaseFilter[] = [
  "before",
  "after",
];

export const DATA_HOOK_TRIGGER_KIND_FILTERS: readonly DataHookTriggerKindFilter[] =
  ["crud", "schedule"];

export const DATA_HOOK_STATUS_FILTERS: readonly DataHookStatusFilter[] = [
  "enabled",
  "disabled",
];

export const DATA_HOOK_LIST_ROW_HOVER_CLASS = "hover:bg-muted/50";
export const DATA_HOOK_LIST_ROW_SELECTED_CLASS =
  "bg-primary/10 hover:bg-primary/15 ring-primary ring-2 ring-inset";

export function isDataHookListSort(value: string): value is DataHookListSort {
  return (
    value === "nameAsc" ||
    value === "nameDesc" ||
    value === "entity" ||
    value === "order" ||
    value === "updatedDesc"
  );
}

export function dataHookSortLabelKey(
  sort: DataHookListSort,
): `dataHooks.list.sort${"NameAsc" | "NameDesc" | "Entity" | "Order" | "UpdatedDesc"}` {
  switch (sort) {
    case "nameDesc":
      return "dataHooks.list.sortNameDesc";
    case "entity":
      return "dataHooks.list.sortEntity";
    case "order":
      return "dataHooks.list.sortOrder";
    case "updatedDesc":
      return "dataHooks.list.sortUpdatedDesc";
    case "nameAsc":
    default:
      return "dataHooks.list.sortNameAsc";
  }
}
