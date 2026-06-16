import {
  FilterPanel,
  FilterValueBadge,
  SearchField,
  SortControls,
} from "@repo/ui";

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
  readonly compact?: boolean;
  readonly transitionClassName?: string;
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
  compact = false,
  transitionClassName,
}: DataViewToolbarProps<T>) {
  const sortableColumns = columns
    .filter((column) => column.sortable !== false)
    .map((column) => ({ id: column.id, label: column.label }));

  const searchFieldClassName = "max-w-none min-w-0 w-full md:flex-1";

  if (compact) {
    if (activeBadges.length === 0) {
      return null;
    }

    return (
      <div
        className={
          transitionClassName
            ? `flex flex-wrap items-center gap-2 ${transitionClassName}`
            : "flex flex-wrap items-center gap-2 transition-opacity duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] motion-reduce:transition-none"
        }
      >
        {activeBadges.map(({ id, label, onRemove }) => (
          <FilterValueBadge
            key={id}
            label={label}
            onRemove={onRemove}
            removeAriaLabel={labels.removeBadge(label)}
          />
        ))}
      </div>
    );
  }

  return (
    <div
      className={
        transitionClassName
          ? `flex flex-col gap-4 ${transitionClassName}`
          : "flex flex-col gap-4 transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] motion-reduce:transition-none"
      }
    >
      {warningMessage ? (
        <p className="text-muted-foreground text-sm">{warningMessage}</p>
      ) : null}

      {showSearch ? (
        <div
          className="w-full min-w-0 md:hidden"
          data-testid="data-view-toolbar-search-row"
        >
          <SearchField
            value={search}
            onChange={setSearch}
            placeholder={labels.searchPlaceholder}
            ariaLabel={labels.searchPlaceholder}
            clearAriaLabel={labels.searchClear}
            className={searchFieldClassName}
          />
        </div>
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
            <div className="hidden min-w-0 flex-1 md:block">
              <SearchField
                value={search}
                onChange={setSearch}
                placeholder={labels.searchPlaceholder}
                ariaLabel={labels.searchPlaceholder}
                clearAriaLabel={labels.searchClear}
                className={searchFieldClassName}
              />
            </div>
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
