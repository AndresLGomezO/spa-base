import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button, toast } from "@repo/ui";
import { useTranslation } from "react-i18next";
import {
  WORKLOAD_DOMAINS,
  WORKLOAD_FREQUENCIES,
  classifyWorkloadSchedule,
  formatScheduleClock,
  resolveWorkloadScheduleTiming,
  type WorkloadDomain,
  type WorkloadFrequency,
} from "@repo/workload-registry";

import {
  applyWorkloadAction,
  type WorkloadAction,
  type WorkloadKind,
  type WorkloadSource,
  type WorkloadStatus,
  type WorkloadWithState,
} from "../../lib/admin-client";

export const OPERATIONAL_WORKLOAD_KINDS: WorkloadKind[] = [
  "cloudTasksQueue",
  "schedulerJob",
  "pubsubSubscription",
  "scheduledDataHook",
];

export const CATALOG_WORKLOAD_KINDS: WorkloadKind[] = [
  "workerRoute",
  "inProcessScheduler",
];

export const ALL_WORKLOAD_SOURCES: WorkloadSource[] = [
  "system",
  "hook",
  "integration",
];

export const ALL_WORKLOAD_DOMAINS: WorkloadDomain[] = [...WORKLOAD_DOMAINS];

export const ALL_WORKLOAD_FREQUENCIES: WorkloadFrequency[] = [
  ...WORKLOAD_FREQUENCIES,
];

export const SCHEDULE_HOUR_PRESETS = [6, 9, 12, 18, 21] as const;

export const ALL_WORKLOAD_STATUSES: WorkloadStatus[] = [
  "running",
  "ready",
  "paused",
  "disabled",
  "unknown",
];

export type WorkloadListSort =
  | "name"
  | "kind"
  | "status"
  | "newest"
  | "scheduleTime";

export {
  classifyWorkloadSchedule,
  formatScheduleClock,
  resolveWorkloadScheduleTiming,
};

export function domainLabelKey(domain: WorkloadDomain): string {
  return `platform.workloads.domain${domain.charAt(0).toUpperCase()}${domain.slice(1)}`;
}

export function frequencyLabelKey(frequency: WorkloadFrequency): string {
  const map: Record<WorkloadFrequency, string> = {
    everyMinute: "platform.workloads.frequencyEveryMinute",
    everyNMinutes: "platform.workloads.frequencyEveryNMinutes",
    hourly: "platform.workloads.frequencyHourly",
    daily: "platform.workloads.frequencyDaily",
    weekly: "platform.workloads.frequencyWeekly",
    monthly: "platform.workloads.frequencyMonthly",
    custom: "platform.workloads.frequencyCustom",
    onDemand: "platform.workloads.frequencyOnDemand",
  };
  return map[frequency];
}

export function formatCountdown(ms: number): string {
  if (!Number.isFinite(ms)) return "—";
  if (ms <= 0) return "0s";
  const totalSec = Math.floor(ms / 1000);
  const days = Math.floor(totalSec / 86_400);
  const hours = Math.floor((totalSec % 86_400) / 3600);
  const minutes = Math.floor((totalSec % 3600) / 60);
  const seconds = totalSec % 60;
  if (days > 0) return `${days}d ${hours}h ${minutes}m`;
  if (hours > 0) return `${hours}h ${minutes}m ${seconds}s`;
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
}

export function formatAbsoluteRunAt(date: Date): string {
  return date.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "medium",
  });
}

export function formatWorkloadScheduleSnippet(
  workload: Pick<WorkloadWithState, "schedule" | "state">,
  t: (key: never) => string,
  now: Date = new Date(),
): string | null {
  const classified = classifyWorkloadSchedule(workload.schedule);
  if (classified.frequency === "onDemand") return null;
  const parts = [t(frequencyLabelKey(classified.frequency) as never)];
  if (classified.minuteOfDay != null) {
    parts.push(`${formatScheduleClock(classified.minuteOfDay)} UTC`);
  }
  const timing = resolveWorkloadScheduleTiming(
    { schedule: workload.schedule, live: workload.state.live },
    now,
  );
  if (timing.nextAt) {
    const ms = timing.nextAt.getTime() - now.getTime();
    // Keep list chrome quiet: minute-level hint only (live countdown is in detail).
    const roundedMs = Math.max(0, Math.ceil(ms / 60_000) * 60_000);
    parts.push(
      ms <= 0
        ? t("platform.workloads.nextRunDue" as never)
        : t("platform.workloads.nextRunIn" as never).replace(
            "{{time}}",
            formatCountdown(roundedMs),
          ),
    );
  }
  return parts.join(" · ");
}

export const WORKLOAD_STATUS_ACCENT_CLASS: Record<WorkloadStatus, string> = {
  running: "border-l-success",
  ready: "border-l-emerald-500/70",
  paused: "border-l-warning",
  disabled: "border-l-destructive",
  unknown: "border-l-muted-foreground/40",
};

export const WORKLOAD_LIST_ROW_HOVER_CLASS = "hover:bg-muted";
export const WORKLOAD_LIST_ROW_SELECTED_CLASS =
  "bg-primary/10 hover:bg-primary/15 ring-primary ring-2 ring-inset";

const CATALOG_KIND_SET = new Set<WorkloadKind>(CATALOG_WORKLOAD_KINDS);

export function isCatalogWorkload(
  workload: Pick<WorkloadWithState, "kind"> | WorkloadKind,
): boolean {
  const kind = typeof workload === "string" ? workload : workload.kind;
  return CATALOG_KIND_SET.has(kind);
}

export function partitionWorkloads(workloads: readonly WorkloadWithState[]): {
  readonly operational: WorkloadWithState[];
  readonly catalog: WorkloadWithState[];
} {
  const operational: WorkloadWithState[] = [];
  const catalog: WorkloadWithState[] = [];
  for (const workload of workloads) {
    if (isCatalogWorkload(workload)) {
      catalog.push(workload);
    } else {
      operational.push(workload);
    }
  }
  return { operational, catalog };
}

export function handlersControlledBy(
  catalog: readonly WorkloadWithState[],
  parentId: string,
): WorkloadWithState[] {
  return catalog.filter((handler) => handler.controlledBy?.includes(parentId));
}

export function filterWorkloadsByScheduleMeta(
  items: readonly WorkloadWithState[],
  filters: {
    readonly domains?: readonly string[];
    readonly frequencies?: readonly string[];
    readonly hours?: readonly number[];
  },
): WorkloadWithState[] {
  return items.filter((workload) => {
    if (filters.domains && filters.domains.length > 0) {
      if (!filters.domains.includes(workload.domain)) return false;
    }
    const classified = classifyWorkloadSchedule(workload.schedule);
    if (filters.frequencies && filters.frequencies.length > 0) {
      if (!filters.frequencies.includes(classified.frequency)) return false;
    }
    if (filters.hours && filters.hours.length > 0) {
      if (classified.hour == null || !filters.hours.includes(classified.hour)) {
        return false;
      }
    }
    return true;
  });
}

export function isWorkloadBusy(
  workload: Pick<WorkloadWithState, "state">,
): boolean {
  const live = workload.state.live;
  if (!live || typeof live !== "object") return false;
  if (live.busy === true) return true;
  if (typeof live.activeRuns === "number" && live.activeRuns > 0) return true;
  if (typeof live.depth === "number" && live.depth > 0) return true;
  return false;
}

export function StatusBadge({
  status,
  size = "default",
}: {
  readonly status: WorkloadStatus;
  readonly size?: "default" | "compact";
}) {
  const { t } = useTranslation("common");

  const colorMap: Record<WorkloadStatus, string> = {
    running:
      "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
    ready: "bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200",
    paused:
      "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
    disabled: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
    unknown: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200",
  };

  const labelMap: Record<WorkloadStatus, string> = {
    running: t("platform.workloads.statusRunning"),
    ready: t("platform.workloads.statusReady"),
    paused: t("platform.workloads.statusPaused"),
    disabled: t("platform.workloads.statusDisabled"),
    unknown: t("platform.workloads.statusUnknown"),
  };

  return (
    <span
      className={`inline-flex items-center rounded-full font-medium ${colorMap[status]} ${
        size === "compact" ? "px-1.5 py-0 text-[10px]" : "px-2 py-0.5 text-xs"
      }`}
    >
      {labelMap[status]}
    </span>
  );
}

/** Secondary chip: work is in flight (does not replace Active/Ready). */
export function BusyBadge({
  size = "default",
}: {
  readonly size?: "default" | "compact";
}) {
  const { t } = useTranslation("common");
  return (
    <span
      className={`inline-flex items-center rounded-full font-medium bg-amber-100 text-amber-900 dark:bg-amber-900 dark:text-amber-100 ${
        size === "compact" ? "px-1.5 py-0 text-[10px]" : "px-2 py-0.5 text-xs"
      }`}
    >
      {t("platform.workloads.statusBusy")}
    </span>
  );
}

/** Neutral docs chip — never looks like Running/Paused. */
export function CatalogHandlerBadge({
  size = "default",
}: {
  readonly size?: "default" | "compact";
}) {
  const { t } = useTranslation("common");
  return (
    <span
      className={`bg-muted text-muted-foreground inline-flex items-center rounded-full font-medium ${
        size === "compact" ? "px-1.5 py-0 text-[10px]" : "px-2 py-0.5 text-xs"
      }`}
    >
      {t("platform.workloads.catalogHandlerBadge")}
    </span>
  );
}

export const WORKLOAD_RUN_STATUSES = [
  "running",
  "success",
  "error",
  "timeout",
  "cancelled",
] as const;
export type WorkloadRunStatus = (typeof WORKLOAD_RUN_STATUSES)[number];

export const WORKLOAD_RUN_TRIGGERS = [
  "scheduler",
  "cloudTasks",
  "pubsub",
  "manual",
  "inProcess",
  "http",
] as const;
export type WorkloadRunTrigger = (typeof WORKLOAD_RUN_TRIGGERS)[number];

const WORKLOAD_RUN_STATUS_BADGE_CLASS: Record<string, string> = {
  success: "bg-badge-success text-badge-success-foreground",
  error: "bg-badge-danger text-badge-danger-foreground",
  timeout:
    "bg-orange-100 text-orange-900 dark:bg-orange-900 dark:text-orange-100",
  running: "bg-badge-warning text-badge-warning-foreground",
  cancelled: "bg-badge-default text-badge-default-foreground",
};

export const WORKLOAD_RUN_STATUS_ACCENT_CLASS: Record<string, string> = {
  success: "border-l-success",
  error: "border-l-destructive",
  timeout: "border-l-orange-500",
  running: "border-l-warning",
  cancelled: "border-l-muted-foreground/40",
};

export const WORKLOAD_RUN_STATUS_BAR_CLASS: Record<string, string> = {
  success: "bg-success",
  error: "bg-destructive",
  timeout: "bg-orange-500",
  running: "bg-warning",
  cancelled: "bg-muted-foreground/60",
};

const RUN_STATUS_SORT_PRIORITY: Record<string, number> = {
  error: 0,
  timeout: 1,
  running: 2,
  cancelled: 3,
  success: 4,
};

export function workloadRunStatusSortPriority(status: string): number {
  return RUN_STATUS_SORT_PRIORITY[status] ?? 99;
}

export function runStatusLabelKey(
  status: string,
): `platform.workloads.runStatus.${string}` {
  return `platform.workloads.runStatus.${status}`;
}

export function runTriggerLabelKey(
  trigger: string,
): `platform.workloads.runTrigger.${string}` {
  return `platform.workloads.runTrigger.${trigger}`;
}

export function WorkloadRunStatusBadge({
  status,
  size = "default",
}: {
  readonly status: string;
  readonly size?: "default" | "compact";
}) {
  const { t } = useTranslation("common");
  const label = t(runStatusLabelKey(status) as never, { defaultValue: status });
  const sizeClass =
    size === "compact"
      ? "px-1.5 py-0 text-[10px] leading-4"
      : "px-2 py-0.5 text-xs";

  return (
    <span
      className={`inline-flex shrink-0 rounded-full font-medium ${sizeClass} ${
        WORKLOAD_RUN_STATUS_BADGE_CLASS[status] ??
        "bg-muted text-muted-foreground"
      }`}
    >
      {label}
    </span>
  );
}

export function WorkloadRunTriggerBadge({
  triggeredBy,
  size = "default",
}: {
  readonly triggeredBy: string;
  readonly size?: "default" | "compact";
}) {
  const { t } = useTranslation("common");
  const label = t(runTriggerLabelKey(triggeredBy) as never, {
    defaultValue: triggeredBy,
  });
  const sizeClass =
    size === "compact"
      ? "px-1.5 py-0 text-[10px] leading-4"
      : "px-2 py-0.5 text-xs";

  return (
    <span
      className={`bg-muted text-muted-foreground inline-flex shrink-0 rounded-full font-medium ${sizeClass}`}
    >
      {label}
    </span>
  );
}

export function WorkloadActionButtons({
  workload,
  compact,
}: {
  readonly workload: WorkloadWithState;
  readonly compact?: boolean;
}) {
  const { t } = useTranslation("common");
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: ({ action }: { action: WorkloadAction }) =>
      applyWorkloadAction(workload.id, action),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["platform-workloads"] });
      queryClient.invalidateQueries({
        queryKey: ["platform-workload", workload.id],
      });
      toast.success(t("platform.workloads.actionSuccess"));
    },
    onError: () => {
      toast.error(t("platform.workloads.actionFailed"));
    },
  });

  const destructiveActions = new Set<WorkloadAction>(["pause", "disable"]);

  const handleAction = (action: WorkloadAction) => {
    if (destructiveActions.has(action)) {
      const confirmed = window.confirm(
        t("platform.workloads.actionConfirmMessage", { action }),
      );
      if (!confirmed) return;
    }
    mutation.mutate({ action });
  };

  if (workload.actions.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap gap-1">
      {workload.actions.map((action) => (
        <Button
          key={action}
          size={compact ? "sm" : "md"}
          variant={destructiveActions.has(action) ? "outline" : "primary"}
          disabled={mutation.isPending}
          onClick={(e) => {
            e.stopPropagation();
            handleAction(action);
          }}
        >
          {t(
            `platform.workloads.action${action.charAt(0).toUpperCase()}${action.slice(1)}` as never,
          )}
        </Button>
      ))}
    </div>
  );
}

export function formatLiveSummary(live?: Record<string, unknown>): string {
  if (!live) return "—";
  const parts: string[] = [];
  if ("depth" in live && live.depth !== undefined) {
    parts.push(`depth: ${live.depth}`);
  }
  if ("nextRunAt" in live && live.nextRunAt) {
    parts.push(`next: ${String(live.nextRunAt).slice(11, 19)}`);
  }
  if (parts.length === 0) {
    return Object.keys(live).length > 0
      ? JSON.stringify(live).slice(0, 40)
      : "—";
  }
  return parts.join(", ");
}

export function kindLabelKey(kind: WorkloadKind): string {
  const map: Record<WorkloadKind, string> = {
    cloudTasksQueue: "platform.workloads.kindCloudTasksQueue",
    schedulerJob: "platform.workloads.kindSchedulerJob",
    pubsubSubscription: "platform.workloads.kindPubsubSubscription",
    scheduledDataHook: "platform.workloads.kindScheduledDataHook",
    workerRoute: "platform.workloads.kindWorkerRoute",
    inProcessScheduler: "platform.workloads.kindInProcessScheduler",
  };
  return map[kind];
}

export function sortWorkloads(
  items: readonly WorkloadWithState[],
  sort: WorkloadListSort,
  now: Date = new Date(),
): WorkloadWithState[] {
  const next = [...items];
  switch (sort) {
    case "kind":
      return next.sort((a, b) => a.kind.localeCompare(b.kind));
    case "status":
      return next.sort((a, b) => a.state.status.localeCompare(b.state.status));
    case "newest":
      return next.sort((a, b) =>
        (b.state.fetchedAt ?? "").localeCompare(a.state.fetchedAt ?? ""),
      );
    case "scheduleTime": {
      // Compute next-run once per item with a single `now`. Creating `new Date()`
      // inside the comparator makes the order non-transitive across a minute/
      // second boundary and scrambles the list + selection highlight.
      const nextAtById = new Map<string, number>();
      for (const workload of next) {
        const timing = resolveWorkloadScheduleTiming(
          { schedule: workload.schedule, live: workload.state.live },
          now,
        );
        nextAtById.set(
          workload.id,
          timing.nextAt?.getTime() ?? Number.POSITIVE_INFINITY,
        );
      }
      return next.sort((a, b) => {
        const byTime =
          (nextAtById.get(a.id) ?? Number.POSITIVE_INFINITY) -
          (nextAtById.get(b.id) ?? Number.POSITIVE_INFINITY);
        if (byTime !== 0) return byTime;
        return a.displayName.localeCompare(b.displayName);
      });
    }
    case "name":
    default:
      return next.sort((a, b) => a.displayName.localeCompare(b.displayName));
  }
}
