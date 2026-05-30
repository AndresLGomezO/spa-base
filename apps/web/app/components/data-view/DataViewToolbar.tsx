import { useTranslation } from "react-i18next";

import type { UseDataViewControlsResult } from "../../hooks/useDataViewControls";
import { DynamicFilterFields } from "./DynamicFilterFields";
import { FilterPanel } from "./FilterPanel";
import { SearchField } from "./SearchField";
import { SortControls } from "./SortControls";
import type { DataViewColumnDescriptor } from "./types";

interface DataViewToolbarProps<T> extends Pick<
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
  readonly filtersOpen: boolean;
  readonly onFiltersOpenChange: (open: boolean) => void;
  readonly warningMessage?: string;
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
  filtersOpen,
  onFiltersOpenChange,
  warningMessage,
}: DataViewToolbarProps<T>) {
  const { t } = useTranslation("common");

  return (
    <div className="flex flex-col gap-4">
      <SearchField
        value={search}
        onChange={setSearch}
        placeholder={t("dataView.searchPlaceholder")}
        ariaLabel={t("dataView.searchPlaceholder")}
      />

      {warningMessage ? (
        <p className="text-muted-foreground text-sm">{warningMessage}</p>
      ) : null}

      <FilterPanel
        open={filtersOpen}
        onOpenChange={onFiltersOpenChange}
        activeBadges={activeBadges}
        triggerLabel={t("dataView.filtersTrigger")}
        clearAllLabel={t("dataView.filtersClearAll")}
        removeAriaLabel={(label) => t("dataView.removeBadge", { label })}
        onClearAll={clearAll}
        badgesBelowToolbar
        sibling={
          <SortControls
            columns={columns}
            sort={sort}
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
        />
      </FilterPanel>
    </div>
  );
}
