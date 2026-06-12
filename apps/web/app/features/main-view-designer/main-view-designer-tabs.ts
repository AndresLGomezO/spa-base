export const MAIN_VIEW_DESIGNER_TAB_IDS = ["settings", "layout"] as const;

export type MainViewDesignerTabId = (typeof MAIN_VIEW_DESIGNER_TAB_IDS)[number];

export const MAIN_VIEW_DESIGNER_TAB_SEARCH_PARAM = "tab";

export function isMainViewDesignerTabId(
  value: string,
): value is MainViewDesignerTabId {
  return (MAIN_VIEW_DESIGNER_TAB_IDS as readonly string[]).includes(value);
}

export function parseMainViewDesignerTabId(
  value: string | null,
): MainViewDesignerTabId {
  if (value && isMainViewDesignerTabId(value)) {
    return value;
  }
  return "settings";
}
