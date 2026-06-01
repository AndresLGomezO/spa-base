import { useMemo, useState } from "react";

export const DEFAULT_DATA_VIEW_PAGE_SIZE = 10;

interface UseClientPaginationOptions {
  readonly pageSize?: number;
  readonly initialPage?: number;
  readonly controlledPage?: number;
  readonly onPageChange?: (page: number) => void;
}

export interface UseClientPaginationResult<T> {
  readonly page: number;
  readonly pageSize: number;
  readonly totalCount: number;
  readonly pageItems: readonly T[];
  readonly setPage: (page: number) => void;
}

export function useClientPagination<T>(
  items: readonly T[],
  options: UseClientPaginationOptions = {},
): UseClientPaginationResult<T> {
  const pageSize = options.pageSize ?? DEFAULT_DATA_VIEW_PAGE_SIZE;
  const isControlled =
    options.controlledPage !== undefined && options.onPageChange !== undefined;
  const [internalPage, setInternalPage] = useState(options.initialPage ?? 1);
  const page = isControlled ? options.controlledPage : internalPage;
  const totalCount = items.length;
  const totalPages = totalCount === 0 ? 0 : Math.ceil(totalCount / pageSize);
  const safePage =
    totalPages === 0 ? 1 : Math.min(Math.max(page ?? 1, 1), totalPages);

  const pageItems = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return items.slice(start, start + pageSize);
  }, [items, pageSize, safePage]);

  const setPage = (nextPage: number) => {
    const normalizedPage = Math.max(1, nextPage);
    if (isControlled) {
      options.onPageChange?.(normalizedPage);
      return;
    }
    setInternalPage(normalizedPage);
  };

  return {
    page: safePage,
    pageSize,
    totalCount,
    pageItems,
    setPage,
  };
}
