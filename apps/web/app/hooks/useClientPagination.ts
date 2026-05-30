import { useMemo, useState } from "react";

const DEFAULT_PAGE_SIZE = 20;

interface UseClientPaginationOptions {
  readonly pageSize?: number;
  readonly initialPage?: number;
}

interface UseClientPaginationResult<T> {
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
  const pageSize = options.pageSize ?? DEFAULT_PAGE_SIZE;
  const [page, setPageState] = useState(options.initialPage ?? 1);
  const totalCount = items.length;
  const totalPages = totalCount === 0 ? 0 : Math.ceil(totalCount / pageSize);
  const safePage =
    totalPages === 0 ? 1 : Math.min(Math.max(page, 1), totalPages);

  const pageItems = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return items.slice(start, start + pageSize);
  }, [items, pageSize, safePage]);

  const setPage = (nextPage: number) => {
    setPageState(Math.max(1, nextPage));
  };

  return {
    page: safePage,
    pageSize,
    totalCount,
    pageItems,
    setPage,
  };
}
