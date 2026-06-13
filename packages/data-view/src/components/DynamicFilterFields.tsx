import { FieldLabel, SearchableMultiSelectDropdown } from "@repo/ui";

import type { DataViewColumnDescriptor, DataViewToolbarLabels } from "../types";

export interface DynamicFilterFieldsProps<T> {
  readonly columns: readonly DataViewColumnDescriptor<T>[];
  readonly filterOptions: Readonly<
    Record<string, readonly { value: string; label: string }[]>
  >;
  readonly filters: Readonly<Record<string, readonly string[]>>;
  readonly onFilterChange: (
    columnId: string,
    values: readonly string[],
  ) => void;
  readonly labels: Pick<
    DataViewToolbarLabels,
    | "filterPlaceholder"
    | "filterSearchPlaceholder"
    | "filterSelectedCount"
    | "noFilterResults"
    | "removeBadge"
  >;
}

export function DynamicFilterFields<T>({
  columns,
  filterOptions,
  filters,
  onFilterChange,
  labels,
}: DynamicFilterFieldsProps<T>) {
  const filterableColumns = columns.filter(
    (column) => column.filterable !== false,
  );

  if (filterableColumns.length === 0) {
    return null;
  }

  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
      {filterableColumns.map((column) => {
        const options = filterOptions[column.id] ?? [];
        if (options.length === 0) {
          return null;
        }

        return (
          <div key={column.id} className="min-w-0 space-y-1">
            <FieldLabel>{column.label}</FieldLabel>
            <SearchableMultiSelectDropdown
              options={options}
              selected={filters[column.id] ?? []}
              onChange={(values) => onFilterChange(column.id, values)}
              placeholder={labels.filterPlaceholder}
              selectedCountLabel={labels.filterSelectedCount}
              searchPlaceholder={labels.filterSearchPlaceholder}
              noResultsLabel={labels.noFilterResults}
              removeAriaLabel={labels.removeBadge}
              ariaLabel={column.label}
              data-testid={`data-view-filter-${column.id}`}
            />
          </div>
        );
      })}
    </div>
  );
}
