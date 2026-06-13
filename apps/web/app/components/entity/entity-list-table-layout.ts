/** Scroll region for entity list tables inside the main page `page-list` slot. */
export const entityListTableScrollClassName =
  "min-h-0 min-w-0 flex-1 overflow-x-auto overflow-y-auto";

/** Lets grouped/custom cell layouts grow wider than the viewport for horizontal scroll. */
export const entityListTableClassName = "w-max min-w-full table-auto";

/** Overrides default table cell truncation so content can define table width. */
export const entityListTableCellClassName = "max-w-none whitespace-normal";

/** Wrapper for the `page-list` slot content (legacy layout + list views). */
export const entityListPageSlotClassName =
  "flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden";
