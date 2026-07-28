import { useCallback, useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";

import {
  listWorkloadRuns,
  type WorkloadRunRecord,
} from "../../lib/admin-client";
import {
  type WorkloadRunStatus,
  type WorkloadRunTrigger,
} from "./workload-ui-shared";
import {
  DEFAULT_WORKLOAD_RUNS_LIST_QUERY,
  availableTriggersInRuns,
  buildWorkloadRunsFilterBadges,
  countRunsByStatus,
  filterWorkloadRuns,
  paginateWorkloadRuns,
  sinceIsoForRange,
  sortWorkloadRuns,
  type WorkloadRunsListQuery,
  type WorkloadRunsListSort,
  type WorkloadRunsPageSize,
  type WorkloadRunsRangeKey,
} from "./workload-runs-list-query";

const FETCH_LIMIT = 100;

export function useWorkloadRunsListQuery(workloadId: string) {
  const [query, setQuery] = useState<WorkloadRunsListQuery>(
    DEFAULT_WORKLOAD_RUNS_LIST_QUERY,
  );
  const [buffer, setBuffer] = useState<WorkloadRunRecord[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);

  const since = sinceIsoForRange(query.rangeKey);

  const runsQuery = useQuery({
    queryKey: ["platform-workload-runs", workloadId, query.rangeKey],
    queryFn: () => listWorkloadRuns(workloadId, { since, limit: FETCH_LIMIT }),
    refetchInterval: 10_000,
  });

  useEffect(() => {
    if (!runsQuery.data) return;
    setBuffer(runsQuery.data.items);
    setNextCursor(runsQuery.data.nextCursor);
  }, [runsQuery.data]);

  useEffect(() => {
    setBuffer([]);
    setNextCursor(null);
    setQuery((prev) => ({ ...prev, page: 1 }));
  }, [workloadId]);

  const filteredSorted = useMemo(() => {
    const filtered = filterWorkloadRuns(buffer, query);
    return sortWorkloadRuns(filtered, query.sort);
  }, [buffer, query]);

  const pagination = useMemo(
    () => paginateWorkloadRuns(filteredSorted, query.page, query.pageSize),
    [filteredSorted, query.page, query.pageSize],
  );

  useEffect(() => {
    if (pagination.page !== query.page) {
      setQuery((prev) => ({ ...prev, page: pagination.page }));
    }
  }, [pagination.page, query.page]);

  const statusCounts = useMemo(() => countRunsByStatus(buffer), [buffer]);
  const availableTriggers = useMemo(
    () => availableTriggersInRuns(buffer),
    [buffer],
  );
  const filterBadges = useMemo(
    () => buildWorkloadRunsFilterBadges(query),
    [query],
  );
  const hasActiveFilters =
    query.search.trim().length > 0 ||
    query.statuses.length > 0 ||
    query.triggeredBy.length > 0 ||
    query.sort !== DEFAULT_WORKLOAD_RUNS_LIST_QUERY.sort;

  const setSearch = useCallback((search: string) => {
    setQuery((prev) => ({ ...prev, search, page: 1 }));
  }, []);

  const setSort = useCallback((sort: WorkloadRunsListSort) => {
    setQuery((prev) => ({ ...prev, sort, page: 1 }));
  }, []);

  const setRangeKey = useCallback((rangeKey: WorkloadRunsRangeKey) => {
    setQuery((prev) => ({ ...prev, rangeKey, page: 1 }));
  }, []);

  const setPageSize = useCallback((pageSize: WorkloadRunsPageSize) => {
    setQuery((prev) => ({ ...prev, pageSize, page: 1 }));
  }, []);

  const setPage = useCallback((page: number) => {
    setQuery((prev) => ({ ...prev, page }));
  }, []);

  const setStatuses = useCallback((statuses: readonly WorkloadRunStatus[]) => {
    setQuery((prev) => ({ ...prev, statuses: [...statuses], page: 1 }));
  }, []);

  const setTriggeredBy = useCallback(
    (triggeredBy: readonly WorkloadRunTrigger[]) => {
      setQuery((prev) => ({ ...prev, triggeredBy: [...triggeredBy], page: 1 }));
    },
    [],
  );

  const clearFilters = useCallback(() => {
    setQuery((prev) => ({
      ...prev,
      search: "",
      sort: DEFAULT_WORKLOAD_RUNS_LIST_QUERY.sort,
      statuses: [],
      triggeredBy: [],
      page: 1,
    }));
  }, []);

  const removeBadge = useCallback((id: string) => {
    setQuery((prev) => {
      if (id === "search") return { ...prev, search: "", page: 1 };
      if (id === "sort") {
        return {
          ...prev,
          sort: DEFAULT_WORKLOAD_RUNS_LIST_QUERY.sort,
          page: 1,
        };
      }
      if (id.startsWith("status:")) {
        const status = id.slice("status:".length) as WorkloadRunStatus;
        return {
          ...prev,
          statuses: prev.statuses.filter((value) => value !== status),
          page: 1,
        };
      }
      if (id.startsWith("triggeredBy:")) {
        const trigger = id.slice("triggeredBy:".length) as WorkloadRunTrigger;
        return {
          ...prev,
          triggeredBy: prev.triggeredBy.filter((value) => value !== trigger),
          page: 1,
        };
      }
      return prev;
    });
  }, []);

  const loadMore = useCallback(async () => {
    if (!nextCursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const page = await listWorkloadRuns(workloadId, {
        since,
        limit: FETCH_LIMIT,
        cursor: nextCursor,
      });
      setBuffer((prev) => {
        const seen = new Set(prev.map((run) => run.id));
        const appended = page.items.filter((run) => !seen.has(run.id));
        return [...prev, ...appended];
      });
      setNextCursor(page.nextCursor);
    } finally {
      setLoadingMore(false);
    }
  }, [loadingMore, nextCursor, since, workloadId]);

  return {
    query,
    buffer,
    pageItems: pagination.pageItems,
    totalFiltered: filteredSorted.length,
    totalPages: pagination.totalPages,
    page: pagination.page,
    nextCursor,
    loadingMore,
    statusCounts,
    availableTriggers,
    filterBadges,
    hasActiveFilters,
    isLoading: runsQuery.isLoading,
    isFetching: runsQuery.isFetching,
    isError: runsQuery.isError,
    setSearch,
    setSort,
    setRangeKey,
    setPageSize,
    setPage,
    setStatuses,
    setTriggeredBy,
    clearFilters,
    removeBadge,
    loadMore,
  };
}
