import { useCallback, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "react-router";

import {
  getTenantIndexProvisioningStatus,
  type IndexProvisioningJob,
} from "../../../lib/api-client";
import { useDebugger } from "../debugger-context";
import { TENANT_INDEX_PROCESS_LIST_QUERY_KEY } from "../index-provisioning-query-keys";
import { indexJobMatchesTimeBounds } from "../index-provisioning-time-filter";

type IndexProvisioningProcessListFilter =
  | "all"
  | "creating"
  | "failed"
  | "ready";

function pollIntervalForSummary(
  creatingCount: number,
  errorCount: number,
): number | false {
  if (creatingCount > 0) {
    return 5_000;
  }
  if (errorCount > 0) {
    return 15_000;
  }
  return false;
}

function parseFilterParam(
  value: string | null,
): IndexProvisioningProcessListFilter {
  if (
    value === "failed" ||
    value === "creating" ||
    value === "ready" ||
    value === "all"
  ) {
    return value;
  }
  return "all";
}

function matchesFilter(
  job: IndexProvisioningJob,
  filter: IndexProvisioningProcessListFilter,
): boolean {
  switch (filter) {
    case "creating":
      return job.phase === "creating";
    case "failed":
      return job.phase === "error";
    case "ready":
      return job.phase === "ready";
    default:
      return true;
  }
}

export function useIndexProvisioningJobs() {
  const [searchParams, setSearchParams] = useSearchParams();
  const filter = parseFilterParam(searchParams.get("filter"));
  const { timeRangeBounds } = useDebugger();

  const setFilter = useCallback(
    (next: IndexProvisioningProcessListFilter) => {
      const nextParams = new URLSearchParams(searchParams);
      if (next === "all") {
        nextParams.delete("filter");
      } else {
        nextParams.set("filter", next);
      }
      setSearchParams(nextParams, { replace: true });
    },
    [searchParams, setSearchParams],
  );

  const statusQuery = useQuery({
    queryKey: [TENANT_INDEX_PROCESS_LIST_QUERY_KEY],
    queryFn: getTenantIndexProvisioningStatus,
    refetchInterval: (query) =>
      pollIntervalForSummary(
        query.state.data?.creatingCount ?? 0,
        query.state.data?.errorCount ?? 0,
      ),
  });

  const summary = statusQuery.data;
  const indexes = useMemo(() => summary?.indexes ?? [], [summary?.indexes]);

  const filteredIndexes = useMemo(
    () =>
      indexes.filter(
        (job) =>
          matchesFilter(job, filter) &&
          indexJobMatchesTimeBounds(job, timeRangeBounds),
      ),
    [filter, indexes, timeRangeBounds],
  );

  const selectedJob = useMemo(() => {
    const signature = searchParams.get("index");
    if (!signature) {
      return null;
    }
    return indexes.find((job) => job.signature === signature) ?? null;
  }, [indexes, searchParams]);

  return {
    filter,
    setFilter,
    summary,
    indexes,
    filteredIndexes,
    selectedJob,
    statusQuery,
  };
}
