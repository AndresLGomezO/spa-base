import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Alert,
  Button,
  Heading,
  Select,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Text,
  toast,
} from "@repo/ui";
import { useSearchParams } from "react-router";
import { useTranslation } from "react-i18next";
import { Search } from "lucide-react";

import { SettingsPanelSkeleton } from "../loading/SettingsPanelSkeleton";
import {
  applyWorkloadAction,
  listWorkloads,
  type WorkloadAction,
  type WorkloadKind,
  type WorkloadSource,
  type WorkloadStatus,
  type WorkloadWithState,
} from "../../lib/admin-client";
import { WorkloadDetailDrawer } from "./WorkloadDetailDrawer";

const ALL_KINDS: WorkloadKind[] = [
  "cloudTasksQueue",
  "schedulerJob",
  "pubsubSubscription",
  "scheduledDataHook",
  "workerRoute",
  "inProcessScheduler",
];

const ALL_SOURCES: WorkloadSource[] = ["system", "hook", "integration"];
const ALL_STATUSES: WorkloadStatus[] = [
  "running",
  "paused",
  "disabled",
  "unknown",
];

function StatusBadge({ status }: { readonly status: WorkloadStatus }) {
  const { t } = useTranslation("common");

  const colorMap: Record<WorkloadStatus, string> = {
    running: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
    paused: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
    disabled: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
    unknown: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200",
  };

  const labelMap: Record<WorkloadStatus, string> = {
    running: t("platform.workloads.statusRunning"),
    paused: t("platform.workloads.statusPaused"),
    disabled: t("platform.workloads.statusDisabled"),
    unknown: t("platform.workloads.statusUnknown"),
  };

  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${colorMap[status]}`}
    >
      {labelMap[status]}
    </span>
  );
}

function WorkloadActionButtons({
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

  const destructiveActions = new Set<WorkloadAction>([
    "pause",
    "disable",
  ]);

  const handleAction = (action: WorkloadAction) => {
    if (destructiveActions.has(action)) {
      const confirmed = window.confirm(
        t("platform.workloads.actionConfirmMessage", { action }),
      );
      if (!confirmed) return;
    }
    mutation.mutate({ action });
  };

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
          {action}
        </Button>
      ))}
    </div>
  );
}

function formatLiveSummary(live?: Record<string, unknown>): string {
  if (!live) return "—";
  const parts: string[] = [];
  if ("depth" in live && live.depth !== undefined) {
    parts.push(`depth: ${live.depth}`);
  }
  if ("nextRunAt" in live && live.nextRunAt) {
    parts.push(`next: ${String(live.nextRunAt).slice(11, 19)}`);
  }
  if (parts.length === 0) {
    return Object.keys(live).length > 0 ? JSON.stringify(live).slice(0, 40) : "—";
  }
  return parts.join(", ");
}

export function PlatformWorkloadsPanel() {
  const { t } = useTranslation("common");
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const q = searchParams.get("q") ?? "";
  const kind = (searchParams.get("kind") as WorkloadKind) || undefined;
  const source = (searchParams.get("source") as WorkloadSource) || undefined;
  const status = (searchParams.get("status") as WorkloadStatus) || undefined;

  const filters = useMemo(
    () => ({ q: q || undefined, kind, source, status }),
    [q, kind, source, status],
  );

  const workloadsQuery = useQuery({
    queryKey: ["platform-workloads", filters],
    queryFn: () => listWorkloads(filters),
    refetchInterval: 10_000,
  });

  const updateParam = (key: string, value: string) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (value) {
        next.set(key, value);
      } else {
        next.delete(key);
      }
      return next;
    });
  };

  if (workloadsQuery.isLoading) {
    return <SettingsPanelSkeleton />;
  }

  if (workloadsQuery.isError) {
    return <Alert>{t("platform.workloads.loadFailed")}</Alert>;
  }

  const workloads = workloadsQuery.data ?? [];

  return (
    <>
      <div className="space-y-4">
        {/* Filter bar */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="text-muted-foreground absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2" />
            <input
              type="text"
              className="border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring h-9 w-full rounded-md border py-1 pl-8 pr-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
              placeholder={t("platform.workloads.searchPlaceholder")}
              value={q}
              onChange={(e) => updateParam("q", e.target.value)}
            />
          </div>
          <Select
            className="w-44"
            value={kind ?? ""}
            aria-label={t("platform.workloads.filterKind")}
            onChange={(e) => updateParam("kind", e.target.value)}
          >
            <option value="">{t("platform.workloads.filterKind")}</option>
            {ALL_KINDS.map((k) => (
              <option key={k} value={k}>
                {t(`platform.workloads.kind${k.charAt(0).toUpperCase() + k.slice(1)}` as never)}
              </option>
            ))}
          </Select>
          <Select
            className="w-36"
            value={source ?? ""}
            aria-label={t("platform.workloads.filterSource")}
            onChange={(e) => updateParam("source", e.target.value)}
          >
            <option value="">{t("platform.workloads.filterSource")}</option>
            {ALL_SOURCES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </Select>
          <Select
            className="w-36"
            value={status ?? ""}
            aria-label={t("platform.workloads.filterStatus")}
            onChange={(e) => updateParam("status", e.target.value)}
          >
            <option value="">{t("platform.workloads.filterStatus")}</option>
            {ALL_STATUSES.map((s) => (
              <option key={s} value={s}>
                {t(`platform.workloads.status${s.charAt(0).toUpperCase() + s.slice(1)}` as never)}
              </option>
            ))}
          </Select>
        </div>

        {/* Table */}
        {workloads.length === 0 ? (
          <Text className="text-muted-foreground py-8 text-center">
            {q || kind || source || status
              ? t("platform.workloads.emptyFiltered")
              : t("platform.workloads.empty")}
          </Text>
        ) : (
          <div className="overflow-x-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("platform.workloads.columnName")}</TableHead>
                  <TableHead>{t("platform.workloads.columnKind")}</TableHead>
                  <TableHead>{t("platform.workloads.columnSource")}</TableHead>
                  <TableHead>{t("platform.workloads.columnStatus")}</TableHead>
                  <TableHead>{t("platform.workloads.columnLive")}</TableHead>
                  <TableHead>
                    {t("platform.workloads.columnLastActivity")}
                  </TableHead>
                  <TableHead>{t("platform.workloads.columnActions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {workloads.map((w) => (
                  <TableRow
                    key={w.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => setSelectedId(w.id)}
                  >
                    <TableCell>
                      <div>
                        <Text className="font-medium">{w.displayName}</Text>
                        {w.description && (
                          <Text className="text-muted-foreground text-xs">
                            {w.description}
                          </Text>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Text className="text-xs">{w.kind}</Text>
                    </TableCell>
                    <TableCell>
                      <Text className="text-xs">{w.source}</Text>
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={w.state.status} />
                    </TableCell>
                    <TableCell>
                      <Text className="text-muted-foreground text-xs">
                        {formatLiveSummary(w.state.live)}
                      </Text>
                    </TableCell>
                    <TableCell>
                      <Text className="text-muted-foreground text-xs">
                        {w.state.fetchedAt
                          ? new Date(w.state.fetchedAt).toLocaleString()
                          : "—"}
                      </Text>
                    </TableCell>
                    <TableCell>
                      <WorkloadActionButtons workload={w} compact />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {selectedId && (
        <WorkloadDetailDrawer
          workloadId={selectedId}
          onClose={() => setSelectedId(null)}
        />
      )}
    </>
  );
}

export { StatusBadge, WorkloadActionButtons };
