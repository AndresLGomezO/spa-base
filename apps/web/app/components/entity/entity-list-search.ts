import type { DataViewColumnDescriptor } from "@repo/data-view";

export function entityHasSearchableColumns(
  columns: readonly Pick<DataViewColumnDescriptor<unknown>, "searchable">[],
): boolean {
  return columns.some((column) => column.searchable === true);
}
