import { FilterPanel, SearchField, SortControls } from "@repo/ui";

import type { UseDataViewControlsResult } from "../hooks/useDataViewControls";
import type { DataViewColumnDescriptor, DataViewToolbarLabels } from "../types";
import { DynamicFilterFields } from "./DynamicFilterFields";

export interface DataViewToolbarProps<T> extends Pick<
  UseDataViewControlsResult<T>,
  | "search"
  | "setSearch"
  | "filters"
  | "setFilter"
  | "sort"
  | "setSortColumn"
  | "toggleSortDirection"
  | "filterOptions"
  | "activeBadges"
  | "clearAll"
> {
  readonly columns: readonly DataViewColumnDescriptor<T>[];
  readonly labels: DataViewToolbarLabels;
  readonly filtersOpen: boolean;
  readonly onFiltersOpenChange: (open: boolean) => void;
  readonly warningMessage?: string;
  readonly showSearch?: boolean;
}

export function DataViewToolbar<T>({
  search,
  setSearch,
  filters,
  setFilter,
  sort,
  setSortColumn,
  toggleSortDirection,
  filterOptions,
  activeBadges,
  clearAll,
  columns,
  labels,
  filtersOpen,
  onFiltersOpenChange,
  warningMessage,
  showSearch = true,
}: DataViewToolbarProps<T>) {
  const sortableColumns = columns
    .filter((column) => column.sortable !== false)
    .map((column) => ({ id: column.id, label: column.label }));

  return (
    <div className="flex flex-col gap-4">
      {warningMessage ? (
        <p className="text-muted-foreground text-sm">{warningMessage}</p>
      ) : null}

      <FilterPanel
        open={filtersOpen}
        onOpenChange={onFiltersOpenChange}
        activeBadges={activeBadges}
        triggerLabel={labels.filtersTrigger}
        clearAllLabel={labels.filtersClearAll}
        removeAriaLabel={labels.removeBadge}
        onClearAll={clearAll}
        badgesBelowToolbar
        toolbarPrefix={
          showSearch ? (
            <SearchField
              value={search}
              onChange={setSearch}
              placeholder={labels.searchPlaceholder}
              ariaLabel={labels.searchPlaceholder}
              className="max-w-none flex-1"
            />
          ) : undefined
        }
        sibling={
          <SortControls
            options={sortableColumns}
            sort={sort}
            sortByLabel={labels.sortBy}
            sortDefaultLabel={labels.sortDefault}
            sortAscendingLabel={labels.sortAscending}
            sortDescendingLabel={labels.sortDescending}
            onColumnChange={setSortColumn}
            onDirectionToggle={toggleSortDirection}
          />
        }
      >
        <DynamicFilterFields
          columns={columns}
          filterOptions={filterOptions}
          filters={filters}
          onFilterChange={setFilter}
          labels={labels}
        />
      </FilterPanel>
    </div>
  );
}
