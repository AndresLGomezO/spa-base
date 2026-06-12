export const ITEM_LIST_DESIGNER_COLUMNS_SCOPE_SEARCH_PARAM = "columnsScope";

export type ItemListColumnsScope = "grouped" | "expanded";

export function parseItemListColumnsScope(
  value: string | null,
): ItemListColumnsScope {
  if (value === "expanded") {
    return "expanded";
  }
  return "grouped";
}
