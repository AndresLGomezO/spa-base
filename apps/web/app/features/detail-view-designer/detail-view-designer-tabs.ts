export const MAIN_VIEW_DESIGNER_TAB_IDS = ["settings", "layout"] as const;

export type DetailViewDesignerTabId =
  (typeof MAIN_VIEW_DESIGNER_TAB_IDS)[number];

export const MAIN_VIEW_DESIGNER_TAB_SEARCH_PARAM = "tab";

export function isDetailViewDesignerTabId(
  value: string,
): value is DetailViewDesignerTabId {
  return (MAIN_VIEW_DESIGNER_TAB_IDS as readonly string[]).includes(value);
}

export function parseDetailViewDesignerTabId(
  value: string | null,
): DetailViewDesignerTabId {
  if (value && isDetailViewDesignerTabId(value)) {
    return value;
  }
  return "settings";
}
