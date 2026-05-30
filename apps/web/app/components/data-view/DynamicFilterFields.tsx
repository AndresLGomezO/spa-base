import { useTranslation } from "react-i18next";

import { FieldLabel } from "@repo/ui";

import { SearchableMultiSelectDropdown } from "./SearchableMultiSelectDropdown";
import type { DataViewColumnDescriptor } from "./types";

interface DynamicFilterFieldsProps<T> {
  readonly columns: readonly DataViewColumnDescriptor<T>[];
  readonly filterOptions: Readonly<
    Record<string, readonly { value: string; label: string }[]>
  >;
  readonly filters: Readonly<Record<string, readonly string[]>>;
  readonly onFilterChange: (
    columnId: string,
    values: readonly string[],
  ) => void;
}

export function DynamicFilterFields<T>({
  columns,
  filterOptions,
  filters,
  onFilterChange,
}: DynamicFilterFieldsProps<T>) {
  const { t } = useTranslation("common");
  const filterableColumns = columns.filter(
    (column) => column.filterable !== false,
  );

  if (filterableColumns.length === 0) {
    return null;
  }

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
      {filterableColumns.map((column) => {
        const options = filterOptions[column.id] ?? [];
        if (options.length === 0) {
          return null;
        }

        return (
          <div key={column.id} className="space-y-1">
            <FieldLabel>{column.label}</FieldLabel>
            <SearchableMultiSelectDropdown
              options={options}
              selected={filters[column.id] ?? []}
              onChange={(values) => onFilterChange(column.id, values)}
              placeholder={t("dataView.filterPlaceholder")}
              selectedCountLabel={(count) =>
                t("dataView.filterSelectedCount", { count })
              }
              searchPlaceholder={t("dataView.filterSearchPlaceholder")}
              noResultsLabel={t("dataView.noFilterResults")}
              removeAriaLabel={(value) =>
                t("dataView.removeBadge", { label: value })
              }
              ariaLabel={column.label}
              data-testid={`data-view-filter-${column.id}`}
            />
          </div>
        );
      })}
    </div>
  );
}
