import { useEffect, useMemo, useState } from "react";

import type { DataViewColumnDescriptor } from "../components/data-view/types";
import {
  useDataViewControls,
  type UseDataViewControlsOptions,
  type UseDataViewControlsResult,
} from "./useDataViewControls";
import { useDataViewUrlState } from "./useDataViewUrlState";
import {
  useClientPagination,
  type UseClientPaginationResult,
} from "./useClientPagination";

interface UseDataViewWithPaginationOptions extends UseDataViewControlsOptions {
  readonly pageSize?: number;
  readonly urlSync?: boolean;
}

export interface UseDataViewWithPaginationResult<T>
  extends UseDataViewControlsResult<T>, UseClientPaginationResult<T> {
  readonly filtersOpen: boolean;
  readonly setFiltersOpen: (open: boolean) => void;
}

export function useDataViewWithPagination<T>(
  items: readonly T[],
  columns: readonly DataViewColumnDescriptor<T>[],
  options: UseDataViewWithPaginationOptions = {},
): UseDataViewWithPaginationResult<T> {
  const [filtersOpen, setFiltersOpen] = useState(false);
  const urlSync = options.urlSync !== false;
  const urlState = useDataViewUrlState(columns);

  const controlled = useMemo(
    () =>
      urlSync
        ? {
            search: urlState.search,
            filters: urlState.filters,
            sort: urlState.sort,
            onSearchChange: urlState.setSearch,
            onFilterChange: urlState.setFilter,
            onSortColumnChange: urlState.setSortColumn,
            onToggleSortDirection: urlState.toggleSortDirection,
            onClearAll: urlState.clearAll,
          }
        : undefined,
    [urlState, urlSync],
  );

  const controls = useDataViewControls(items, columns, {
    ...options,
    controlled,
  });

  const pagination = useClientPagination(controls.filteredItems, {
    pageSize: options.pageSize,
    ...(urlSync
      ? {
          controlledPage: urlState.page,
          onPageChange: urlState.setPage,
        }
      : {}),
  });

  useEffect(() => {
    if (urlSync) {
      return;
    }

    pagination.setPage(1);
  }, [
    controls.search,
    controls.filters,
    controls.sort.columnId,
    controls.sort.direction,
    urlSync,
  ]);

  return {
    ...controls,
    ...pagination,
    filtersOpen,
    setFiltersOpen,
  };
}
