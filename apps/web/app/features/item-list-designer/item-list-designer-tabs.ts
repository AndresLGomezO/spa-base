export const ITEM_LIST_DESIGNER_TAB_IDS = [
  "settings",
  "columns",
  "layout",
] as const;

export type ItemListDesignerTabId = (typeof ITEM_LIST_DESIGNER_TAB_IDS)[number];

export const ITEM_LIST_DESIGNER_TAB_SEARCH_PARAM = "tab";

export function isItemListDesignerTabId(
  value: string,
): value is ItemListDesignerTabId {
  return (ITEM_LIST_DESIGNER_TAB_IDS as readonly string[]).includes(value);
}

export function parseItemListDesignerTabId(
  value: string | null,
): ItemListDesignerTabId {
  if (value && isItemListDesignerTabId(value)) {
    return value;
  }
  return "settings";
}
