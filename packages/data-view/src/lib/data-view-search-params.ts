import type {
  DataViewSortDirection,
  DataViewSortState,
  DataViewColumnDescriptor,
} from "../types";

const Q_PARAM = "q";
const SORT_PARAM = "sort";
const SORT_DIR_PARAM = "dir";
const PAGE_PARAM = "page";
export const FILTER_PARAM_PREFIX = "f.";

interface DataViewUrlState {
  readonly search: string;
  readonly filters: Readonly<Record<string, readonly string[]>>;
  readonly sort: DataViewSortState;
  readonly page: number;
}

interface DataViewColumnIdSets {
  readonly filterableColumnIds: ReadonlySet<string>;
  readonly sortableColumnIds: ReadonlySet<string>;
}

type DataViewStatePatch = Partial<{
  readonly search: string;
  readonly filters: Readonly<Record<string, readonly string[]>>;
  readonly sort: DataViewSortState;
  readonly page: number;
}>;

function filterParamKey(columnId: string): string {
  return `${FILTER_PARAM_PREFIX}${columnId}`;
}

function parseStringListParam(
  params: URLSearchParams,
  key: string,
): readonly string[] {
  return params
    .getAll(key)
    .map((value) => value.trim())
    .filter(Boolean);
}

function setStringListParam(
  params: URLSearchParams,
  key: string,
  values: readonly string[],
): void {
  params.delete(key);
  for (const value of values) {
    if (value.trim()) {
      params.append(key, value);
    }
  }
}

function parseFiltersFromSearchParams(
  params: URLSearchParams,
  filterableColumnIds: ReadonlySet<string>,
): Readonly<Record<string, readonly string[]>> {
  const filters: Record<string, string[]> = {};

  for (const columnId of filterableColumnIds) {
    const values = parseStringListParam(params, filterParamKey(columnId));
    if (values.length > 0) {
      filters[columnId] = [...values];
    }
  }

  return filters;
}

export function dataViewStateFromSearchParams(
  params: URLSearchParams,
  columnIds: DataViewColumnIdSets,
): DataViewUrlState {
  const sortParam = params.get(SORT_PARAM) ?? "";
  const sortColumn = columnIds.sortableColumnIds.has(sortParam)
    ? sortParam
    : null;
  const sortDirParam = params.get(SORT_DIR_PARAM);
  const sortDirection: DataViewSortDirection =
    sortDirParam === "desc" ? "desc" : "asc";

  return {
    search: params.get(Q_PARAM) ?? "",
    filters: parseFiltersFromSearchParams(
      params,
      columnIds.filterableColumnIds,
    ),
    sort: {
      columnId: sortColumn,
      direction: sortColumn === null ? "asc" : sortDirection,
    },
    page: Math.max(1, Number(params.get(PAGE_PARAM)) || 1),
  };
}

export function applyDataViewStateToSearchParams(
  prev: URLSearchParams,
  patch: DataViewStatePatch,
  columnIds: readonly string[],
): URLSearchParams {
  const next = new URLSearchParams(prev);

  if (patch.search !== undefined) {
    const trimmed = patch.search.trim();
    if (trimmed) {
      next.set(Q_PARAM, trimmed);
    } else {
      next.delete(Q_PARAM);
    }
  }

  if (patch.filters !== undefined) {
    for (const columnId of columnIds) {
      const values = patch.filters[columnId];
      if (values !== undefined) {
        setStringListParam(next, filterParamKey(columnId), values);
      }
    }
  }

  if (patch.sort !== undefined) {
    if (patch.sort.columnId === null) {
      next.delete(SORT_PARAM);
      next.delete(SORT_DIR_PARAM);
    } else {
      next.set(SORT_PARAM, patch.sort.columnId);
      next.set(
        SORT_DIR_PARAM,
        patch.sort.direction === "desc" ? "desc" : "asc",
      );
    }
  }

  if (patch.page !== undefined) {
    if (patch.page <= 1) {
      next.delete(PAGE_PARAM);
    } else {
      next.set(PAGE_PARAM, String(patch.page));
    }
  }

  return next;
}

export function clearDataViewParamsFromSearchParams(
  prev: URLSearchParams,
  columnIds: readonly string[],
): URLSearchParams {
  const next = new URLSearchParams(prev);
  next.delete(Q_PARAM);
  next.delete(SORT_PARAM);
  next.delete(SORT_DIR_PARAM);
  next.delete(PAGE_PARAM);

  for (const columnId of columnIds) {
    next.delete(filterParamKey(columnId));
  }

  return next;
}

export function getDataViewColumnIds(
  columns: readonly Pick<
    DataViewColumnDescriptor<unknown>,
    "id" | "filterable" | "sortable"
  >[],
): {
  readonly allColumnIds: readonly string[];
  readonly columnIdSets: DataViewColumnIdSets;
} {
  const filterableColumnIds = new Set<string>();
  const sortableColumnIds = new Set<string>();

  for (const column of columns) {
    if (column.filterable !== false) {
      filterableColumnIds.add(column.id);
    }
    if (column.sortable !== false) {
      sortableColumnIds.add(column.id);
    }
  }

  return {
    allColumnIds: columns.map((column) => column.id),
    columnIdSets: {
      filterableColumnIds,
      sortableColumnIds,
    },
  };
}
