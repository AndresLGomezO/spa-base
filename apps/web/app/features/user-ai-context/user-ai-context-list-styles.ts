export const USER_AI_CONTEXT_STATUS_FILTERS = ["enabled", "disabled"] as const;
export type UserAiContextStatusFilter =
  (typeof USER_AI_CONTEXT_STATUS_FILTERS)[number];

export const USER_AI_CONTEXT_SCOPE_FILTERS = ["tenantWide", "perUser"] as const;
export type UserAiContextScopeFilter =
  (typeof USER_AI_CONTEXT_SCOPE_FILTERS)[number];

export const USER_AI_CONTEXT_BLOCK_KIND_FILTERS = [
  "staticMarkdown",
  "entityField",
  "entityRecordsSummary",
  "metricValue",
  "savedQueryTop",
] as const;
export type UserAiContextBlockKindFilter =
  (typeof USER_AI_CONTEXT_BLOCK_KIND_FILTERS)[number];

export const USER_AI_CONTEXT_LIST_SORTS = [
  "order",
  "nameAsc",
  "nameDesc",
  "updatedDesc",
] as const;
export type UserAiContextListSort = (typeof USER_AI_CONTEXT_LIST_SORTS)[number];

export const DEFAULT_USER_AI_CONTEXT_LIST_SORT: UserAiContextListSort = "order";

export function isUserAiContextListSort(
  value: string,
): value is UserAiContextListSort {
  return (USER_AI_CONTEXT_LIST_SORTS as readonly string[]).includes(value);
}

export const USER_AI_CONTEXT_LIST_ROW_HOVER_CLASS =
  "hover:bg-muted/60 cursor-pointer";
export const USER_AI_CONTEXT_LIST_ROW_SELECTED_CLASS =
  "bg-muted ring-1 ring-inset ring-border";
