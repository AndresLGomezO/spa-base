import type { DataViewColumnDescriptor, DataViewFilterOption } from "../types";
import { serializeDataViewFilterValue } from "./serialize-data-view-filter-value";

function formatColumnValue<T>(
  column: DataViewColumnDescriptor<T>,
  value: unknown,
): string {
  if (column.formatValue) {
    return column.formatValue(value);
  }

  if (value === null || value === undefined) {
    return "";
  }

  if (typeof value === "boolean") {
    return value ? "true" : "false";
  }

  return String(value);
}

export function deriveDataViewFilterOptions<T>(
  items: readonly T[],
  columns: readonly DataViewColumnDescriptor<T>[],
): Readonly<Record<string, readonly DataViewFilterOption[]>> {
  const options: Record<string, DataViewFilterOption[]> = {};

  for (const column of columns) {
    if (column.filterable === false) {
      continue;
    }

    const uniqueValues = new Map<string, string>();

    for (const item of items) {
      const rawValue = column.getValue(item);
      const valuesToProcess = Array.isArray(rawValue) ? rawValue : [rawValue];

      for (const entry of valuesToProcess) {
        if (entry === null || entry === undefined || entry === "") {
          continue;
        }

        const filterValue = column.getFilterValue
          ? column.getFilterValue(entry)
          : serializeDataViewFilterValue(entry);
        if (!filterValue) {
          continue;
        }

        const label = column.getDisplayValue
          ? column.getDisplayValue(item)
          : formatColumnValue(column, entry);

        uniqueValues.set(filterValue, label);
      }
    }

    options[column.id] = [...uniqueValues.entries()]
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([value, label]) => ({ value, label }));
  }

  return options;
}
