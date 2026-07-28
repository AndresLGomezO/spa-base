import type { WorkloadRunRecord } from "../../lib/admin-client";
import {
  WORKLOAD_RUN_STATUSES,
  WORKLOAD_RUN_TRIGGERS,
  workloadRunStatusSortPriority,
  type WorkloadRunStatus,
  type WorkloadRunTrigger,
} from "./workload-ui-shared";

export const WORKLOAD_RUNS_RANGE_OPTIONS = [
  { key: "15m", ms: 15 * 60_000 },
  { key: "1h", ms: 60 * 60_000 },
  { key: "24h", ms: 24 * 60 * 60_000 },
  { key: "7d", ms: 7 * 24 * 60 * 60_000 },
] as const;

export type WorkloadRunsRangeKey =
  (typeof WORKLOAD_RUNS_RANGE_OPTIONS)[number]["key"];

export const WORKLOAD_RUNS_PAGE_SIZE_OPTIONS = [10, 50, 100] as const;
export type WorkloadRunsPageSize =
  (typeof WORKLOAD_RUNS_PAGE_SIZE_OPTIONS)[number];

export type WorkloadRunsListSort = "newest" | "oldest" | "status" | "duration";

export type WorkloadRunsListQuery = {
  readonly search: string;
  readonly sort: WorkloadRunsListSort;
  readonly statuses: readonly WorkloadRunStatus[];
  readonly triggeredBy: readonly WorkloadRunTrigger[];
  readonly rangeKey: WorkloadRunsRangeKey;
  readonly page: number;
  readonly pageSize: WorkloadRunsPageSize;
};

export const DEFAULT_WORKLOAD_RUNS_LIST_QUERY: WorkloadRunsListQuery = {
  search: "",
  sort: "newest",
  statuses: [],
  triggeredBy: [],
  rangeKey: "24h",
  page: 1,
  pageSize: 10,
};

function rangeMsForKey(rangeKey: WorkloadRunsRangeKey): number {
  return (
    WORKLOAD_RUNS_RANGE_OPTIONS.find((option) => option.key === rangeKey)?.ms ??
    WORKLOAD_RUNS_RANGE_OPTIONS[2].ms
  );
}

export function sinceIsoForRange(rangeKey: WorkloadRunsRangeKey): string {
  return new Date(Date.now() - rangeMsForKey(rangeKey)).toISOString();
}

export function runMatchesSearch(
  run: WorkloadRunRecord,
  search: string,
): boolean {
  const q = search.trim().toLowerCase();
  if (!q) return true;
  const errorText =
    typeof run.error === "string"
      ? run.error
      : run.error && typeof run.error === "object"
        ? JSON.stringify(run.error)
        : "";
  return (
    run.id.toLowerCase().includes(q) ||
    run.workloadId.toLowerCase().includes(q) ||
    run.triggeredBy.toLowerCase().includes(q) ||
    run.status.toLowerCase().includes(q) ||
    errorText.toLowerCase().includes(q)
  );
}

export function filterWorkloadRuns(
  runs: readonly WorkloadRunRecord[],
  query: Pick<WorkloadRunsListQuery, "search" | "statuses" | "triggeredBy">,
): WorkloadRunRecord[] {
  return runs.filter((run) => {
    if (!runMatchesSearch(run, query.search)) return false;
    if (
      query.statuses.length > 0 &&
      !query.statuses.includes(run.status as WorkloadRunStatus)
    ) {
      return false;
    }
    if (
      query.triggeredBy.length > 0 &&
      !query.triggeredBy.includes(run.triggeredBy as WorkloadRunTrigger)
    ) {
      return false;
    }
    return true;
  });
}

export function sortWorkloadRuns(
  runs: readonly WorkloadRunRecord[],
  sort: WorkloadRunsListSort,
): WorkloadRunRecord[] {
  const copy = [...runs];
  switch (sort) {
    case "oldest":
      return copy.sort((a, b) => a.startedAt.localeCompare(b.startedAt));
    case "status":
      return copy.sort((a, b) => {
        const byStatus =
          workloadRunStatusSortPriority(a.status) -
          workloadRunStatusSortPriority(b.status);
        if (byStatus !== 0) return byStatus;
        return b.startedAt.localeCompare(a.startedAt);
      });
    case "duration":
      return copy.sort((a, b) => {
        const aMs = a.durationMs ?? -1;
        const bMs = b.durationMs ?? -1;
        if (bMs !== aMs) return bMs - aMs;
        return b.startedAt.localeCompare(a.startedAt);
      });
    case "newest":
    default:
      return copy.sort((a, b) => b.startedAt.localeCompare(a.startedAt));
  }
}

export function paginateWorkloadRuns(
  runs: readonly WorkloadRunRecord[],
  page: number,
  pageSize: WorkloadRunsPageSize,
): {
  readonly pageItems: WorkloadRunRecord[];
  readonly totalPages: number;
  readonly page: number;
} {
  const totalPages = Math.max(1, Math.ceil(runs.length / pageSize));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const start = (safePage - 1) * pageSize;
  return {
    pageItems: runs.slice(start, start + pageSize),
    totalPages,
    page: safePage,
  };
}

export function countRunsByStatus(
  runs: readonly WorkloadRunRecord[],
): Record<WorkloadRunStatus, number> {
  const counts = Object.fromEntries(
    WORKLOAD_RUN_STATUSES.map((status) => [status, 0]),
  ) as Record<WorkloadRunStatus, number>;
  for (const run of runs) {
    if ((WORKLOAD_RUN_STATUSES as readonly string[]).includes(run.status)) {
      counts[run.status as WorkloadRunStatus] += 1;
    }
  }
  return counts;
}

export function availableTriggersInRuns(
  runs: readonly WorkloadRunRecord[],
): WorkloadRunTrigger[] {
  const present = new Set(
    runs
      .map((run) => run.triggeredBy)
      .filter((value): value is WorkloadRunTrigger =>
        (WORKLOAD_RUN_TRIGGERS as readonly string[]).includes(value),
      ),
  );
  return WORKLOAD_RUN_TRIGGERS.filter((trigger) => present.has(trigger));
}

type WorkloadRunsFilterBadge = {
  readonly id: string;
  readonly label: string;
};

export function buildWorkloadRunsFilterBadges(
  query: WorkloadRunsListQuery,
): WorkloadRunsFilterBadge[] {
  const badges: WorkloadRunsFilterBadge[] = [];
  if (query.search.trim()) {
    badges.push({ id: "search", label: query.search.trim() });
  }
  if (query.sort !== DEFAULT_WORKLOAD_RUNS_LIST_QUERY.sort) {
    badges.push({ id: "sort", label: query.sort });
  }
  for (const status of query.statuses) {
    badges.push({ id: `status:${status}`, label: status });
  }
  for (const trigger of query.triggeredBy) {
    badges.push({ id: `triggeredBy:${trigger}`, label: trigger });
  }
  return badges;
}
