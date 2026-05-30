import { useCallback, useMemo } from "react";
import { useSearchParams } from "react-router";

import type { DataViewColumnDescriptor } from "../components/data-view/types";
import {
  applyDataViewStateToSearchParams,
  clearDataViewParamsFromSearchParams,
  dataViewStateFromSearchParams,
  getDataViewColumnIds,
} from "../lib/data-view-search-params";

interface UseDataViewUrlStateResult {
  readonly search: string;
  readonly filters: Readonly<Record<string, readonly string[]>>;
  readonly sort: {
    readonly columnId: string | null;
    readonly direction: "asc" | "desc";
  };
  readonly page: number;
  readonly setSearch: (value: string) => void;
  readonly setFilter: (columnId: string, values: readonly string[]) => void;
  readonly setSortColumn: (columnId: string | null) => void;
  readonly toggleSortDirection: () => void;
  readonly setPage: (page: number) => void;
  readonly clearAll: () => void;
}

export function useDataViewUrlState<T>(
  columns: readonly DataViewColumnDescriptor<T>[],
): UseDataViewUrlStateResult {
  const [searchParams, setSearchParams] = useSearchParams();
  const { allColumnIds, columnIdSets } = useMemo(
    () => getDataViewColumnIds(columns),
    [columns],
  );

  const state = useMemo(
    () => dataViewStateFromSearchParams(searchParams, columnIdSets),
    [columnIdSets, searchParams],
  );

  const patchUrl = useCallback(
    (patch: Parameters<typeof applyDataViewStateToSearchParams>[1]) => {
      setSearchParams(
        (prev) => applyDataViewStateToSearchParams(prev, patch, allColumnIds),
        { replace: true },
      );
    },
    [allColumnIds, setSearchParams],
  );

  const setSearch = useCallback(
    (value: string) => {
      patchUrl({ search: value, page: 1 });
    },
    [patchUrl],
  );

  const setFilter = useCallback(
    (columnId: string, values: readonly string[]) => {
      patchUrl({
        filters: {
          ...state.filters,
          [columnId]: values,
        },
        page: 1,
      });
    },
    [patchUrl, state.filters],
  );

  const setSortColumn = useCallback(
    (columnId: string | null) => {
      patchUrl({
        sort: {
          columnId,
          direction: "asc",
        },
        page: 1,
      });
    },
    [patchUrl],
  );

  const toggleSortDirection = useCallback(() => {
    if (state.sort.columnId === null) {
      return;
    }

    patchUrl({
      sort: {
        columnId: state.sort.columnId,
        direction: state.sort.direction === "asc" ? "desc" : "asc",
      },
      page: 1,
    });
  }, [patchUrl, state.sort.columnId, state.sort.direction]);

  const setPage = useCallback(
    (page: number) => {
      patchUrl({ page });
    },
    [patchUrl],
  );

  const clearAll = useCallback(() => {
    setSearchParams(
      (prev) => clearDataViewParamsFromSearchParams(prev, allColumnIds),
      { replace: true },
    );
  }, [allColumnIds, setSearchParams]);

  return {
    search: state.search,
    filters: state.filters,
    sort: state.sort,
    page: state.page,
    setSearch,
    setFilter,
    setSortColumn,
    toggleSortDirection,
    setPage,
    clearAll,
  };
}
