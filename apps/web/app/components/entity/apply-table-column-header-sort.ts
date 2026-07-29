import type { DataViewSortState } from "@repo/data-view";

/** Apply / flip sort when a table column title is clicked. */
export function applyTableColumnHeaderSort(
  fieldPath: string,
  sort: DataViewSortState,
  setSortColumn: (columnId: string | null) => void,
  toggleSortDirection: () => void,
): void {
  if (sort.columnId === fieldPath) {
    toggleSortDirection();
    return;
  }
  setSortColumn(fieldPath);
}
