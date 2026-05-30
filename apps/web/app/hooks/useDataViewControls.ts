import { useCallback, useMemo, useState } from "react";

import type {
  DataViewColumnDescriptor,
  DataViewFilterBadge,
  DataViewSortDirection,
  DataViewSortState,
} from "../components/data-view/types";
import { deriveDataViewFilterOptions } from "../lib/derive-data-view-filter-options";
import { matchesDataViewSearch } from "../lib/matches-data-view-search";

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

function compareValues(left: string, right: string): number {
  return left.localeCompare(right, undefined, {
    numeric: true,
    sensitivity: "base",
  });
}

function getRowId<T>(
  item: T,
  columns: readonly DataViewColumnDescriptor<T>[],
): string {
  const columnWithRowId = columns.find((column) => column.getRowId);
  if (columnWithRowId?.getRowId) {
    return columnWithRowId.getRowId(item);
  }

  if (typeof item === "object" && item !== null && "id" in item) {
    return String((item as { id: unknown }).id);
  }

  return JSON.stringify(item);
}

function matchesColumnFilters<T>(
  item: T,
  filters: Readonly<Record<string, readonly string[]>>,
  columns: readonly DataViewColumnDescriptor<T>[],
): boolean {
  for (const [columnId, selectedValues] of Object.entries(filters)) {
    if (selectedValues.length === 0) {
      continue;
    }

    const column = columns.find((entry) => entry.id === columnId);
    if (!column) {
      continue;
    }

    const rawValue = column.getValue(item);
    if (Array.isArray(rawValue)) {
      const normalizedValues = rawValue.map((entry) =>
        formatColumnValue(column, entry),
      );
      if (!selectedValues.some((value) => normalizedValues.includes(value))) {
        return false;
      }
      continue;
    }

    const normalizedValue = column.getDisplayValue
      ? column.getDisplayValue(item)
      : typeof rawValue === "boolean"
        ? rawValue
          ? "true"
          : "false"
        : formatColumnValue(column, rawValue);

    if (!selectedValues.includes(normalizedValue)) {
      return false;
    }
  }

  return true;
}

function sortItems<T>(
  items: readonly T[],
  sort: DataViewSortState,
  columns: readonly DataViewColumnDescriptor<T>[],
): readonly T[] {
  if (!sort.columnId) {
    return items;
  }

  const column = columns.find((entry) => entry.id === sort.columnId);
  if (!column || column.sortable === false) {
    return items;
  }

  const directionMultiplier = sort.direction === "asc" ? 1 : -1;

  return [...items].sort((left, right) => {
    const leftValue = getColumnDisplayValue(column, left);
    const rightValue = getColumnDisplayValue(column, right);
    const comparison =
      compareValues(leftValue, rightValue) * directionMultiplier;

    if (comparison !== 0) {
      return comparison;
    }

    return compareValues(getRowId(left, columns), getRowId(right, columns));
  });
}

export interface DataViewControlledState {
  readonly search: string;
  readonly filters: Readonly<Record<string, readonly string[]>>;
  readonly sort: DataViewSortState;
  readonly onSearchChange: (value: string) => void;
  readonly onFilterChange: (
    columnId: string,
    values: readonly string[],
  ) => void;
  readonly onSortColumnChange: (columnId: string | null) => void;
  readonly onToggleSortDirection: () => void;
  readonly onClearAll: () => void;
}

export interface UseDataViewControlsOptions {
  readonly formatFilterBadgeLabel?: (
    columnLabel: string,
    valueLabel: string,
  ) => string;
  readonly controlled?: DataViewControlledState;
}

export interface UseDataViewControlsResult<T> {
  readonly search: string;
  readonly setSearch: (value: string) => void;
  readonly filters: Readonly<Record<string, readonly string[]>>;
  readonly setFilter: (columnId: string, values: readonly string[]) => void;
  readonly sort: DataViewSortState;
  readonly setSortColumn: (columnId: string | null) => void;
  readonly toggleSortDirection: () => void;
  readonly filteredItems: readonly T[];
  readonly filterOptions: Readonly<
    Record<string, readonly { value: string; label: string }[]>
  >;
  readonly activeBadges: readonly DataViewFilterBadge[];
  readonly clearAll: () => void;
  readonly hasActiveControls: boolean;
}

export function useDataViewControls<T>(
  items: readonly T[],
  columns: readonly DataViewColumnDescriptor<T>[],
  options: UseDataViewControlsOptions = {},
): UseDataViewControlsResult<T> {
  const [internalSearch, setInternalSearchState] = useState("");
  const [internalFilters, setInternalFilters] = useState<
    Record<string, readonly string[]>
  >({});
  const [internalSort, setInternalSort] = useState<DataViewSortState>({
    columnId: null,
    direction: "asc",
  });

  const controlled = options.controlled;
  const search = controlled?.search ?? internalSearch;
  const filters = controlled?.filters ?? internalFilters;
  const sort = controlled?.sort ?? internalSort;

  const filterOptions = useMemo(
    () => deriveDataViewFilterOptions(items, columns),
    [columns, items],
  );

  const filteredItems = useMemo(() => {
    const searched = items.filter((item) =>
      matchesDataViewSearch(item, search, columns),
    );
    const filtered = searched.filter((item) =>
      matchesColumnFilters(item, filters, columns),
    );
    return sortItems(filtered, sort, columns);
  }, [columns, filters, items, search, sort]);

  const setSearch = useCallback(
    (value: string) => {
      if (controlled) {
        controlled.onSearchChange(value);
        return;
      }
      setInternalSearchState(value);
    },
    [controlled],
  );

  const setFilter = useCallback(
    (columnId: string, values: readonly string[]) => {
      if (controlled) {
        controlled.onFilterChange(columnId, values);
        return;
      }
      setInternalFilters((current) => ({
        ...current,
        [columnId]: values,
      }));
    },
    [controlled],
  );

  const setSortColumn = useCallback(
    (columnId: string | null) => {
      if (controlled) {
        controlled.onSortColumnChange(columnId);
        return;
      }
      setInternalSort({
        columnId,
        direction: "asc",
      });
    },
    [controlled],
  );

  const toggleSortDirection = useCallback(() => {
    if (controlled) {
      controlled.onToggleSortDirection();
      return;
    }
    setInternalSort((current) => ({
      ...current,
      direction:
        current.direction === "asc"
          ? ("desc" as DataViewSortDirection)
          : ("asc" as DataViewSortDirection),
    }));
  }, [controlled]);

  const clearAll = useCallback(() => {
    if (controlled) {
      controlled.onClearAll();
      return;
    }
    setInternalSearchState("");
    setInternalFilters({});
    setInternalSort({ columnId: null, direction: "asc" });
  }, [controlled]);

  const activeBadges = useMemo(() => {
    const badges: DataViewFilterBadge[] = [];

    for (const column of columns) {
      const selectedValues = filters[column.id] ?? [];
      if (selectedValues.length === 0) {
        continue;
      }

      const columnOptions = filterOptions[column.id] ?? [];

      for (const selectedValue of selectedValues) {
        const optionLabel =
          columnOptions.find((option) => option.value === selectedValue)
            ?.label ?? selectedValue;
        const label = options.formatFilterBadgeLabel
          ? options.formatFilterBadgeLabel(column.label, optionLabel)
          : `${column.label}: ${optionLabel}`;

        badges.push({
          id: `${column.id}:${selectedValue}`,
          label,
          onRemove: () => {
            setFilter(
              column.id,
              selectedValues.filter((value) => value !== selectedValue),
            );
          },
        });
      }
    }

    return badges;
  }, [
    columns,
    filterOptions,
    filters,
    options.formatFilterBadgeLabel,
    setFilter,
  ]);

  const hasActiveControls =
    search.trim().length > 0 ||
    Object.values(filters).some((values) => values.length > 0) ||
    sort.columnId !== null;

  return {
    search,
    setSearch,
    filters,
    setFilter,
    sort,
    setSortColumn,
    toggleSortDirection,
    filteredItems,
    filterOptions,
    activeBadges,
    clearAll,
    hasActiveControls,
  };
}
