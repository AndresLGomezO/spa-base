import type { DataViewColumnDescriptor } from "../components/data-view/types";

function formatColumnValue<T>(
  column: DataViewColumnDescriptor<T>,
  value: unknown,
): string {
  if (value === null || value === undefined) {
    return "";
  }

  if (column.formatValue) {
    return column.formatValue(value);
  }

  if (Array.isArray(value)) {
    return value.map(String).join(" ");
  }

  return String(value);
}

function getColumnDisplayValue<T>(
  column: DataViewColumnDescriptor<T>,
  item: T,
): string {
  if (column.getDisplayValue) {
    return column.getDisplayValue(item);
  }

  return formatColumnValue(column, column.getValue(item));
}

export function matchesDataViewSearch<T>(
  item: T,
  query: string,
  columns: readonly DataViewColumnDescriptor<T>[],
): boolean {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) {
    return true;
  }

  const haystack = columns
    .filter((column) => column.searchable !== false)
    .map((column) => getColumnDisplayValue(column, item))
    .join(" ")
    .toLowerCase();

  return haystack.includes(normalizedQuery);
}
