import type { DataViewColumnDescriptor, DataViewFilterOption } from "../types";

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

function inferFilterKind<T>(
  column: DataViewColumnDescriptor<T>,
  values: readonly unknown[],
): "multi-select" | "boolean" {
  if (column.filterKind) {
    return column.filterKind;
  }

  if (values.every((value) => typeof value === "boolean")) {
    return "boolean";
  }

  return "multi-select";
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

    const rawValues = items.flatMap((item) => {
      if (column.getDisplayValue) {
        const displayValue = column.getDisplayValue(item);
        return displayValue ? [displayValue] : [];
      }

      const value = column.getValue(item);
      if (Array.isArray(value)) {
        return value;
      }
      return [value];
    });
    const filterKind = inferFilterKind(column, rawValues);
    const uniqueValues = new Map<string, string>();

    for (const rawValue of rawValues) {
      if (rawValue === null || rawValue === undefined || rawValue === "") {
        continue;
      }

      const formatted = formatColumnValue(column, rawValue);
      if (!formatted) {
        continue;
      }

      const key =
        filterKind === "boolean"
          ? rawValue === true
            ? "true"
            : "false"
          : formatted;
      uniqueValues.set(key, formatted);
    }

    options[column.id] = [...uniqueValues.entries()]
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([value, label]) => ({ value, label }));
  }

  return options;
}
