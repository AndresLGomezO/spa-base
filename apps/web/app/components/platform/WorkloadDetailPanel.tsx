import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Alert,
  Button,
  Checkbox,
  FilterPanel,
  FilterPanelBody,
  Heading,
  SearchField,
  TabbedPanel,
  Text,
  useFilterPanelDismiss,
  type TabbedPanelTabId,
} from "@repo/ui";
import { AdminSelect as Select } from "~/components/admin/AdminSelect";
import { cn } from "@repo/theme/utils";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import { ArrowLeft, ExternalLink } from "lucide-react";

import {
  getWorkload,
  getWorkloadRunLogs,
  getWorkloadRunTrace,
  type WorkloadRunArtifactRef,
  type WorkloadWithState,
  type WorkloadStats24h,
} from "../../lib/admin-client";
import {
  designerPreviewPanelBodyFillClassName,
  designerPreviewPanelHeaderClassName,
  designerPreviewPanelShellClassName,
  designerPreviewPanelShellFillClassName,
} from "../../features/ui-builder/designer-tree-workbench-classes";
import {
  StatusBadge,
  BusyBadge,
  CatalogHandlerBadge,
  WorkloadActionButtons,
  WorkloadRunStatusBadge,
  WorkloadRunTriggerBadge,
  WORKLOAD_RUN_STATUSES,
  WORKLOAD_RUN_STATUS_ACCENT_CLASS,
  WORKLOAD_RUN_STATUS_BAR_CLASS,
  handlersControlledBy,
  isCatalogWorkload,
  isWorkloadBusy,
  kindLabelKey,
  domainLabelKey,
  frequencyLabelKey,
  classifyWorkloadSchedule,
  formatScheduleClock,
  formatAbsoluteRunAt,
  formatCountdown,
  resolveWorkloadScheduleTiming,
  runStatusLabelKey,
  runTriggerLabelKey,
} from "./workload-ui-shared";
import {
  WORKLOAD_RUNS_PAGE_SIZE_OPTIONS,
  WORKLOAD_RUNS_RANGE_OPTIONS,
  type WorkloadRunsListSort,
  type WorkloadRunsPageSize,
  type WorkloadRunsRangeKey,
} from "./workload-runs-list-query";
import { useWorkloadRunsListQuery } from "./use-workload-runs-list-query";
import { WorkloadSummaryPanel } from "./WorkloadSummaryPanel";
import {
  RelatedHandlersList,
  WorkloadCatalogPanel,
} from "./WorkloadCatalogPanel";

function useTickingNow(intervalMs = 1_000): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), intervalMs);
    return () => window.clearInterval(id);
  }, [intervalMs]);
  return now;
}

function ScheduleTimingBlock({
  workload,
}: {
  readonly workload: WorkloadWithState;
}) {
  const { t } = useTranslation("common");
  const now = useTickingNow();
  if (!workload.schedule?.cron) return null;

  const timing = resolveWorkloadScheduleTiming(
    { schedule: workload.schedule, live: workload.state.live },
    now,
  );
  const msLeft =
    timing.nextAt != null ? timing.nextAt.getTime() - now.getTime() : null;

  return (
    <div className="space-y-2">
      <Heading level={3}>{t("platform.workloads.scheduleTiming")}</Heading>
      <div className="grid grid-cols-2 gap-2 text-sm">
        <Text className="text-muted-foreground">
          {t("platform.workloads.nextRun")}
        </Text>
        <div className="space-y-0.5">
          <Text className="text-sm">
            {timing.nextAt ? formatAbsoluteRunAt(timing.nextAt) : "—"}
          </Text>
          {msLeft != null ? (
            <Text
              className={
                msLeft <= 0
                  ? "text-warning text-xs font-medium"
                  : "text-muted-foreground font-mono text-xs"
              }
            >
              {msLeft <= 0
                ? t("platform.workloads.nextRunDue")
                : t("platform.workloads.nextRunIn", {
                    time: formatCountdown(msLeft),
                  })}
            </Text>
          ) : null}
        </div>
        <Text className="text-muted-foreground">
          {t("platform.workloads.lastRun")}
        </Text>
        <div className="space-y-0.5">
          <Text className="text-sm">
            {timing.lastAt ? formatAbsoluteRunAt(timing.lastAt) : "—"}
          </Text>
          {timing.lastAt && !timing.lastFromLive ? (
            <Text className="text-muted-foreground text-xs">
              {t("platform.workloads.lastRunEstimated")}
            </Text>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function OverviewTab({
  workload,
  stats24h,
  relatedHandlers,
  parentLabels,
  onSelect,
}: {
  readonly workload: WorkloadWithState;
  readonly stats24h?: WorkloadStats24h;
  readonly relatedHandlers: readonly WorkloadWithState[];
  readonly parentLabels: ReadonlyMap<string, string>;
  readonly onSelect: (id: string) => void;
}) {
  const { t } = useTranslation("common");
  const catalog = isCatalogWorkload(workload);

  return (
    <div className="space-y-4 p-4">
      {catalog ? (
        <Text className="text-muted-foreground text-sm">
          {t("platform.workloads.catalogDetailHint")}
        </Text>
      ) : null}

      <div className="space-y-2">
        <Heading level={3}>{t("platform.workloads.overviewMetadata")}</Heading>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <Text className="text-muted-foreground">ID</Text>
          <Text className="font-mono text-xs">{workload.id}</Text>
          <Text className="text-muted-foreground">Kind</Text>
          <Text>{t(kindLabelKey(workload.kind) as never)}</Text>
          <Text className="text-muted-foreground">Source</Text>
          <Text>
            {t(
              `platform.workloads.source${workload.source.charAt(0).toUpperCase()}${workload.source.slice(1)}` as never,
            )}
          </Text>
          <Text className="text-muted-foreground">
            {t("platform.workloads.filterDomain")}
          </Text>
          <Text>{t(domainLabelKey(workload.domain) as never)}</Text>
          {workload.schedule?.cron ? (
            <>
              <Text className="text-muted-foreground">
                {t("platform.workloads.scheduleCron")}
              </Text>
              <Text className="font-mono text-xs">
                {workload.schedule.cron}
                {workload.schedule.timezone
                  ? ` (${workload.schedule.timezone})`
                  : " (UTC)"}
              </Text>
              <Text className="text-muted-foreground">
                {t("platform.workloads.filterFrequency")}
              </Text>
              <Text>
                {(() => {
                  const classified = classifyWorkloadSchedule(
                    workload.schedule,
                  );
                  const freq = t(
                    frequencyLabelKey(classified.frequency) as never,
                  );
                  return classified.minuteOfDay != null
                    ? `${freq} · ${formatScheduleClock(classified.minuteOfDay)} UTC`
                    : freq;
                })()}
              </Text>
            </>
          ) : null}
          {!catalog ? (
            <>
              <Text className="text-muted-foreground">Status</Text>
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge status={workload.state.status} />
                {isWorkloadBusy(workload) ? <BusyBadge /> : null}
                {workload.state.status === "running" &&
                workload.schedule &&
                !isWorkloadBusy(workload) ? (
                  <Text className="text-muted-foreground text-xs">
                    {t("platform.workloads.timerLive")}
                  </Text>
                ) : null}
                {isWorkloadBusy(workload) &&
                typeof workload.state.live?.activeRuns === "number" &&
                workload.state.live.activeRuns > 0 ? (
                  <Text className="text-muted-foreground text-xs">
                    {t("platform.workloads.busyActiveRuns", {
                      count: workload.state.live.activeRuns,
                    })}
                  </Text>
                ) : null}
                {isWorkloadBusy(workload) &&
                typeof workload.state.live?.depth === "number" &&
                workload.state.live.depth > 0 ? (
                  <Text className="text-muted-foreground text-xs">
                    {t("platform.workloads.busyPendingTasks")}
                  </Text>
                ) : null}
              </div>
            </>
          ) : null}
          {workload.route ? (
            <>
              <Text className="text-muted-foreground">Route</Text>
              <Text className="font-mono text-xs">{workload.route}</Text>
            </>
          ) : null}
          {workload.sourceFile ? (
            <>
              <Text className="text-muted-foreground">Source File</Text>
              <Text className="font-mono text-xs">{workload.sourceFile}</Text>
            </>
          ) : null}
          {workload.disableHint ? (
            <>
              <Text className="text-muted-foreground">
                {t("platform.workloads.disableHint")}
              </Text>
              <Text className="text-sm">{workload.disableHint}</Text>
            </>
          ) : null}
          {workload.controlledBy && workload.controlledBy.length > 0 ? (
            <>
              <Text className="text-muted-foreground">
                {t("platform.workloads.openParent")}
              </Text>
              <div className="flex flex-col gap-1">
                {workload.controlledBy.map((parentId) => (
                  <button
                    key={parentId}
                    type="button"
                    className="text-primary text-left text-sm underline-offset-2 hover:underline"
                    onClick={() => onSelect(parentId)}
                  >
                    {parentLabels.get(parentId) ?? parentId}
                  </button>
                ))}
              </div>
            </>
          ) : null}
          {workload.gcpConsoleUrl ? (
            <>
              <Text className="text-muted-foreground">
                {t("platform.workloads.gcpConsole")}
              </Text>
              <a
                href={workload.gcpConsoleUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary inline-flex items-center gap-1 text-sm underline-offset-2 hover:underline"
              >
                {t("platform.workloads.openGcpConsole")}
                <ExternalLink className="h-3 w-3" />
              </a>
            </>
          ) : null}
        </div>
      </div>

      <ScheduleTimingBlock key={workload.id} workload={workload} />

      {!catalog &&
      workload.state.live &&
      Object.keys(workload.state.live).length > 0 ? (
        <div className="space-y-2">
          <Heading level={3}>
            {t("platform.workloads.overviewLiveState")}
          </Heading>
          <pre className="bg-muted overflow-auto rounded-md p-3 text-xs">
            {JSON.stringify(workload.state.live, null, 2)}
          </pre>
        </div>
      ) : null}

      {stats24h ? (
        <div className="space-y-2">
          <Heading level={3}>
            {t("platform.workloads.overviewStats24h")}
          </Heading>
          <div className="grid grid-cols-5 gap-2 text-center">
            {(
              Object.entries(stats24h) as [keyof WorkloadStats24h, number][]
            ).map(([key, value]) => (
              <div key={key} className="space-y-1">
                <Text className="text-muted-foreground text-xs">{key}</Text>
                <Text className="text-lg font-semibold">{value}</Text>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {!catalog && relatedHandlers.length > 0 ? (
        <div className="space-y-2">
          <Heading level={3}>{t("platform.workloads.relatedHandlers")}</Heading>
          <Text className="text-muted-foreground text-xs">
            {t("platform.workloads.relatedHandlersHint")}
          </Text>
          <RelatedHandlersList handlers={relatedHandlers} onSelect={onSelect} />
        </div>
      ) : null}

      {!catalog && workload.actions.length > 0 ? (
        <div className="space-y-2">
          <Heading level={3}>{t("platform.workloads.columnActions")}</Heading>
          <WorkloadActionButtons workload={workload} />
        </div>
      ) : null}
    </div>
  );
}

function RunStatusBar({ counts }: { readonly counts: Record<string, number> }) {
  const entries = Object.entries(counts).filter(([, count]) => count > 0);
  if (entries.length === 0) return null;

  return (
    <div className="flex h-2.5 w-full overflow-hidden rounded-full">
      {entries.map(([status, count]) => (
        <div
          key={status}
          className={WORKLOAD_RUN_STATUS_BAR_CLASS[status] ?? "bg-muted"}
          style={{ flex: count }}
          title={`${status}: ${count}`}
        />
      ))}
    </div>
  );
}

function RunsTab({
  workloadId,
  fanOutQueueId,
  onSelectWorkload,
}: {
  readonly workloadId: string;
  readonly fanOutQueueId?: string;
  readonly onSelectWorkload?: (id: string) => void;
}) {
  const { t } = useTranslation("common");
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const toolbarRef = useRef<HTMLDivElement>(null);

  const {
    query,
    buffer,
    pageItems,
    totalFiltered,
    totalPages,
    page,
    nextCursor,
    loadingMore,
    statusCounts,
    availableTriggers,
    filterBadges,
    hasActiveFilters,
    isLoading,
    isError,
    setSearch,
    setSort,
    setRangeKey,
    setPageSize,
    setPage,
    toggleStatus,
    toggleTriggeredBy,
    clearFilters,
    removeBadge,
    loadMore,
  } = useWorkloadRunsListQuery(workloadId);

  useFilterPanelDismiss(filtersOpen, setFiltersOpen, toolbarRef);

  const displayBadges = useMemo(
    () =>
      filterBadges.map((badge) => {
        let label = badge.label;
        if (badge.id === "sort") {
          label = t(
            `platform.workloads.runsSort${badge.label.charAt(0).toUpperCase()}${badge.label.slice(1)}` as never,
          );
        } else if (badge.id.startsWith("status:")) {
          const status = badge.id.slice("status:".length);
          label = t(runStatusLabelKey(status) as never, {
            defaultValue: status,
          });
        } else if (badge.id.startsWith("triggeredBy:")) {
          const trigger = badge.id.slice("triggeredBy:".length);
          label = t(runTriggerLabelKey(trigger) as never, {
            defaultValue: trigger,
          });
        }
        return {
          id: badge.id,
          label,
          onRemove: () => removeBadge(badge.id),
        };
      }),
    [filterBadges, removeBadge, t],
  );

  if (selectedRunId) {
    return (
      <RunDetailSubPanel
        workloadId={workloadId}
        runId={selectedRunId}
        onBack={() => setSelectedRunId(null)}
      />
    );
  }

  const filterBody = (
    <div className="grid gap-6 sm:grid-cols-2">
      <div className="space-y-3">
        <Text className="text-muted-foreground text-xs font-medium">
          {t("platform.workloads.runsFilterByStatus")}
        </Text>
        <div className="flex flex-col gap-2">
          {WORKLOAD_RUN_STATUSES.map((status) => (
            <Checkbox
              key={status}
              id={`workload-runs-status-${status}`}
              checked={query.statuses.includes(status)}
              onChange={() => toggleStatus(status)}
              label={
                <span className="flex items-center gap-2">
                  <WorkloadRunStatusBadge status={status} size="compact" />
                  <span className="text-muted-foreground text-xs">
                    {statusCounts[status] ?? 0}
                  </span>
                </span>
              }
            />
          ))}
        </div>
      </div>
      <div className="space-y-3">
        <Text className="text-muted-foreground text-xs font-medium">
          {t("platform.workloads.runsFilterByTrigger")}
        </Text>
        <div className="flex flex-col gap-2">
          {(availableTriggers.length > 0 ? availableTriggers : []).map(
            (trigger) => (
              <Checkbox
                key={trigger}
                id={`workload-runs-trigger-${trigger}`}
                checked={query.triggeredBy.includes(trigger)}
                onChange={() => toggleTriggeredBy(trigger)}
                label={
                  <WorkloadRunTriggerBadge
                    triggeredBy={trigger}
                    size="compact"
                  />
                }
              />
            ),
          )}
          {availableTriggers.length === 0 ? (
            <Text className="text-muted-foreground text-xs">
              {t("platform.workloads.runsNoTriggersYet")}
            </Text>
          ) : null}
        </div>
      </div>
    </div>
  );

  const emptyMessage = isLoading
    ? t("loading")
    : isError
      ? t("platform.workloads.runsLoadFailed")
      : buffer.length === 0
        ? t("platform.workloads.runsEmpty")
        : t("platform.workloads.runsEmptyFiltered");

  return (
    <div className="flex min-h-0 flex-col gap-3 p-4">
      {fanOutQueueId ? (
        <Alert>
          <span>
            {t("platform.workloads.runsFanOutHint", {
              queue: fanOutQueueId,
            })}{" "}
          </span>
          {onSelectWorkload ? (
            <button
              type="button"
              className="text-primary underline-offset-2 hover:underline"
              onClick={() => onSelectWorkload(fanOutQueueId)}
            >
              {fanOutQueueId}
            </button>
          ) : null}
        </Alert>
      ) : null}

      <SearchField
        value={query.search}
        onChange={setSearch}
        placeholder={t("platform.workloads.runsSearchPlaceholder")}
        ariaLabel={t("platform.workloads.runsSearchPlaceholder")}
        clearAriaLabel={t("platform.workloads.runsSearchClear")}
        className="max-w-none min-w-0 w-full"
      />

      <div className="flex flex-wrap gap-1">
        {WORKLOAD_RUNS_RANGE_OPTIONS.map((opt) => (
          <Button
            key={opt.key}
            size="sm"
            variant={query.rangeKey === opt.key ? "primary" : "outline"}
            onClick={() => setRangeKey(opt.key as WorkloadRunsRangeKey)}
          >
            {t(
              `platform.workloads.runsRange${opt.key.charAt(0).toUpperCase()}${opt.key.slice(1)}` as never,
            )}
          </Button>
        ))}
      </div>

      <div
        ref={toolbarRef}
        className={`w-full min-w-0 ${filtersOpen ? "relative isolate z-30" : ""}`}
      >
        <div className="flex w-full min-w-0 flex-nowrap items-end gap-2">
          <div className="min-w-0 flex-1">
            <FilterPanel
              open={filtersOpen}
              onOpenChange={setFiltersOpen}
              activeBadges={displayBadges}
              triggerLabel={t("platform.workloads.runsFilter")}
              clearAllLabel={t("platform.workloads.runsClearFilters")}
              removeAriaLabel={(label) =>
                t("platform.workloads.runsRemoveBadge", { label })
              }
              onClearAll={clearFilters}
              badgesBelowToolbar
              renderBody={false}
              compact
              toolbarFillWidth
              manageDismiss={false}
              sibling={
                <div className="flex w-auto shrink-0 items-end gap-2 py-0.5">
                  <label className="inline-flex flex-col gap-1">
                    <span className="text-muted-foreground text-xs font-medium">
                      {t("platform.workloads.runsSort")}
                    </span>
                    <Select
                      selectSize="sm"
                      className="w-auto min-w-[9rem]"
                      value={query.sort}
                      onChange={(event) =>
                        setSort(event.target.value as WorkloadRunsListSort)
                      }
                      aria-label={t("platform.workloads.runsSort")}
                    >
                      <option value="newest">
                        {t("platform.workloads.runsSortNewest")}
                      </option>
                      <option value="oldest">
                        {t("platform.workloads.runsSortOldest")}
                      </option>
                      <option value="status">
                        {t("platform.workloads.runsSortStatus")}
                      </option>
                      <option value="duration">
                        {t("platform.workloads.runsSortDuration")}
                      </option>
                    </Select>
                  </label>
                  <label className="inline-flex flex-col gap-1">
                    <span className="text-muted-foreground text-xs font-medium">
                      {t("platform.workloads.runsPageSize")}
                    </span>
                    <Select
                      selectSize="sm"
                      className="w-auto min-w-[5rem]"
                      value={String(query.pageSize)}
                      onChange={(event) =>
                        setPageSize(
                          Number(event.target.value) as WorkloadRunsPageSize,
                        )
                      }
                      aria-label={t("platform.workloads.runsPageSize")}
                    >
                      {WORKLOAD_RUNS_PAGE_SIZE_OPTIONS.map((size) => (
                        <option key={size} value={size}>
                          {size}
                        </option>
                      ))}
                    </Select>
                  </label>
                </div>
              }
            >
              {filterBody}
            </FilterPanel>
          </div>
        </div>
        <FilterPanelBody
          open={filtersOpen}
          onClearAll={clearFilters}
          clearAllLabel={t("platform.workloads.runsClearFilters")}
          disabled={false}
        >
          {filterBody}
        </FilterPanelBody>
      </div>

      <RunStatusBar counts={statusCounts} />

      {pageItems.length === 0 ? (
        <Text className="text-muted-foreground py-4 text-center text-sm">
          {emptyMessage}
        </Text>
      ) : (
        <div className="max-h-[420px] space-y-1 overflow-auto">
          {pageItems.map((run) => {
            const accent =
              WORKLOAD_RUN_STATUS_ACCENT_CLASS[run.status] ??
              "border-l-muted-foreground/40";
            return (
              <button
                key={run.id}
                type="button"
                className={cn(
                  "hover:bg-muted/60 flex w-full cursor-pointer items-start gap-3 rounded-md border-l-2 px-3 py-2 text-left transition-colors",
                  accent,
                )}
                onClick={() => setSelectedRunId(run.id)}
              >
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <WorkloadRunStatusBadge
                      status={run.status}
                      size="compact"
                    />
                    <WorkloadRunTriggerBadge
                      triggeredBy={run.triggeredBy}
                      size="compact"
                    />
                    <Text className="text-muted-foreground font-mono text-[11px]">
                      {new Date(run.startedAt).toLocaleString()}
                    </Text>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <Text className="font-mono text-xs">{run.workloadId}</Text>
                    <Text className="text-muted-foreground text-xs">
                      {run.durationMs != null ? `${run.durationMs}ms` : "—"}
                    </Text>
                    {run.error ? (
                      <Text className="text-destructive line-clamp-1 text-xs">
                        {typeof run.error === "string"
                          ? run.error
                          : t("platform.workloads.runDetailError")}
                      </Text>
                    ) : null}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
        <Text className="text-muted-foreground text-xs">
          {t("platform.workloads.runsPageSummary", {
            filtered: totalFiltered,
            loaded: buffer.length,
            page,
            totalPages,
          })}
        </Text>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={page <= 1}
            onClick={() => setPage(page - 1)}
          >
            {t("platform.workloads.runsPrevPage")}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={page >= totalPages}
            onClick={() => setPage(page + 1)}
          >
            {t("platform.workloads.runsNextPage")}
          </Button>
          {nextCursor ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={loadingMore}
              onClick={() => {
                void loadMore();
              }}
            >
              {loadingMore
                ? t("platform.workloads.runsLoadingMore")
                : t("platform.workloads.runsLoadMore")}
            </Button>
          ) : null}
        </div>
      </div>

      {hasActiveFilters && pageItems.length === 0 && buffer.length > 0 ? (
        <div className="flex justify-center">
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={clearFilters}
          >
            {t("platform.workloads.runsClearFilters")}
          </Button>
        </div>
      ) : null}
    </div>
  );
}

function buildArtifactLink(
  ref:
    | WorkloadRunArtifactRef
    | { readonly kind?: string; readonly id?: string },
): { to: string; label: string } | null {
  const kind = typeof ref.kind === "string" ? ref.kind : "";
  const id = typeof ref.id === "string" ? ref.id : "";
  if (!kind || !id) return null;

  if (kind === "hookExecution") {
    return {
      to: `/debugger/hook-executions?record=hookExecution:${id}`,
      label: "Hook Execution",
    };
  }
  if (kind === "aiJob") {
    return { to: `/debugger/ai-jobs?record=aiJob:${id}`, label: "AI Job" };
  }
  if (kind === "emailIngestJob") {
    return {
      to: `/debugger/email-ingest?record=emailIngestJob:${id}`,
      label: "Email Ingest Job",
    };
  }
  return null;
}

function RunDetailSubPanel({
  workloadId,
  runId,
  onBack,
}: {
  readonly workloadId: string;
  readonly runId: string;
  readonly onBack: () => void;
}) {
  const { t } = useTranslation("common");

  const runQuery = useQuery({
    queryKey: ["platform-workload-run", workloadId, runId],
    queryFn: () =>
      import("../../lib/admin-client").then((mod) =>
        mod.getWorkloadRun(workloadId, runId),
      ),
    refetchInterval: (query) =>
      query.state.data?.status === "running" ? 3_000 : false,
  });

  const logsQuery = useQuery({
    queryKey: ["platform-workload-run-logs", workloadId, runId],
    queryFn: () => getWorkloadRunLogs(workloadId, runId, { tail: 200 }),
    refetchInterval: () =>
      runQuery.data?.status === "running" ? 3_000 : false,
    enabled: !!runQuery.data,
  });

  const traceQuery = useQuery({
    queryKey: [
      "platform-workload-run-trace",
      runQuery.data?.rootRunId ?? runId,
    ],
    queryFn: () => getWorkloadRunTrace(runQuery.data?.rootRunId ?? runId),
    enabled: !!runQuery.data,
  });

  const run = runQuery.data;
  if (!run) {
    return (
      <div className="p-4">
        <Button variant="ghost" size="sm" onClick={onBack}>
          ← Back
        </Button>
        <Text className="text-muted-foreground mt-4">Loading…</Text>
      </div>
    );
  }

  return (
    <div className="space-y-4 overflow-auto p-4">
      <Button variant="ghost" size="sm" onClick={onBack}>
        ← Back
      </Button>

      <div className="flex items-center gap-2">
        <Heading level={3}>Run</Heading>
        <WorkloadRunStatusBadge status={run.status} />
        <WorkloadRunTriggerBadge triggeredBy={run.triggeredBy} size="compact" />
        {run.durationMs != null ? (
          <Text className="text-muted-foreground text-xs">
            {run.durationMs}ms
          </Text>
        ) : null}
      </div>

      {run.error ? (
        <div className="space-y-1">
          <Heading level={3}>{t("platform.workloads.runDetailError")}</Heading>
          <Alert>{run.error}</Alert>
        </div>
      ) : null}

      {run.metrics && Object.keys(run.metrics).length > 0 ? (
        <details className="space-y-1">
          <summary className="cursor-pointer text-sm font-medium">
            {t("platform.workloads.runDetailMetrics")}
          </summary>
          <pre className="bg-muted overflow-auto rounded-md p-2 text-xs">
            {JSON.stringify(run.metrics, null, 2)}
          </pre>
        </details>
      ) : null}

      {run.artifactRefs && run.artifactRefs.length > 0 ? (
        <div className="space-y-1">
          <Text className="text-sm font-medium">
            {t("platform.workloads.runDetailArtifacts")}
          </Text>
          <div className="flex flex-wrap gap-2">
            {run.artifactRefs.map((ref, index) => {
              const link = buildArtifactLink(ref);
              const key = `${ref.kind}:${ref.id}:${index}`;
              if (!link) {
                return (
                  <Text key={key} className="text-muted-foreground text-xs">
                    {ref.kind}: {ref.id}
                  </Text>
                );
              }
              return (
                <Link
                  key={key}
                  to={link.to}
                  className="text-primary text-xs underline"
                >
                  {link.label}
                </Link>
              );
            })}
          </div>
        </div>
      ) : null}

      {traceQuery.data && traceQuery.data.length > 1 ? (
        <div className="space-y-1">
          <Text className="text-sm font-medium">
            {t("platform.workloads.runDetailTrace")}
          </Text>
          <div className="space-y-0.5">
            {traceQuery.data.map((tr) => {
              const indent = tr.parentRunId ? "ml-4" : "";
              return (
                <div
                  key={tr.id}
                  className={`flex items-center gap-2 rounded px-2 py-1 text-xs ${indent} ${
                    tr.id === runId ? "bg-muted" : ""
                  }`}
                >
                  <span
                    className={`inline-block h-2 w-2 rounded-full ${
                      tr.status === "success"
                        ? "bg-green-500"
                        : tr.status === "error"
                          ? "bg-red-500"
                          : "bg-gray-400"
                    }`}
                  />
                  <span className="font-mono">{tr.id.slice(0, 8)}</span>
                  <span className="text-muted-foreground">{tr.status}</span>
                  {tr.durationMs != null ? (
                    <span className="text-muted-foreground">
                      {tr.durationMs}ms
                    </span>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>
      ) : null}

      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <Text className="text-sm font-medium">
            {t("platform.workloads.runDetailLogs")}
          </Text>
          {logsQuery.data?.cloudLoggingUrl ? (
            <a
              href={logsQuery.data.cloudLoggingUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary inline-flex items-center gap-1 text-xs underline"
            >
              {t("platform.workloads.openCloudLogging")}
              <ExternalLink className="h-3 w-3" />
            </a>
          ) : null}
        </div>
        {logsQuery.data?.entries && logsQuery.data.entries.length > 0 ? (
          <pre className="bg-muted max-h-[200px] overflow-auto rounded-md p-2 font-mono text-xs">
            {logsQuery.data.entries.map((entry) => (
              <div key={`${entry.timestamp}-${entry.message.slice(0, 20)}`}>
                <span className="text-muted-foreground">
                  {entry.timestamp.slice(11, 23)}
                </span>{" "}
                {entry.severity ? (
                  <span
                    className={
                      entry.severity === "ERROR"
                        ? "text-red-600"
                        : "text-muted-foreground"
                    }
                  >
                    [{entry.severity}]{" "}
                  </span>
                ) : null}
                {entry.message}
              </div>
            ))}
          </pre>
        ) : (
          <Text className="text-muted-foreground text-xs">
            {t("platform.workloads.logsEmpty")}
          </Text>
        )}
      </div>
    </div>
  );
}

function ConfigTab({ workload }: { readonly workload: WorkloadWithState }) {
  const { t } = useTranslation("common");
  const { state: _, ...record } = workload;
  void _;

  return (
    <div className="p-4">
      <Heading level={3}>{t("platform.workloads.tabConfig")}</Heading>
      <pre className="bg-muted mt-2 overflow-auto rounded-md p-3 text-xs">
        {JSON.stringify(record, null, 2)}
      </pre>
    </div>
  );
}

export function WorkloadDetailPanel({
  workloadId,
  catalogView,
  operationalWorkloads,
  catalogHandlers,
  parentLabels,
  onClearSelection,
  onSelect,
  onRefresh,
  isRefreshing,
  lastUpdatedAt,
}: {
  readonly workloadId: string | null;
  readonly catalogView?: boolean;
  readonly operationalWorkloads: readonly WorkloadWithState[];
  readonly catalogHandlers: readonly WorkloadWithState[];
  readonly parentLabels: ReadonlyMap<string, string>;
  readonly onClearSelection: () => void;
  readonly onSelect: (id: string) => void;
  readonly onRefresh?: () => void;
  readonly isRefreshing?: boolean;
  readonly lastUpdatedAt?: number | null;
}) {
  const { t } = useTranslation("common");
  const [activeTab, setActiveTab] = useState<TabbedPanelTabId>("overview");

  useEffect(() => {
    setActiveTab("overview");
  }, [workloadId]);

  const detailQuery = useQuery({
    queryKey: ["platform-workload", workloadId],
    queryFn: () => getWorkload(workloadId!),
    enabled: !!workloadId,
  });

  const workload = detailQuery.data?.workload;
  const stats24h = detailQuery.data?.stats24h;
  const catalog = workload ? isCatalogWorkload(workload) : false;

  const relatedHandlers = useMemo(
    () =>
      !workload || catalog
        ? []
        : handlersControlledBy(catalogHandlers, workload.id),
    [workload, catalog, catalogHandlers],
  );

  const tabs = useMemo(() => {
    if (!workload || !workloadId) return [];
    const fanOutQueueId =
      workload.id === "scheduler:gmail-poll" ||
      workload.id === "pubsub:gmail-push-api" ||
      workload.id === "inprocess:local-gmail-poll"
        ? "queue:gmail-jobs"
        : undefined;
    return [
      {
        id: "overview" as const,
        label: t("platform.workloads.tabOverview"),
        panel: (
          <OverviewTab
            workload={workload}
            stats24h={stats24h}
            relatedHandlers={relatedHandlers}
            parentLabels={parentLabels}
            onSelect={onSelect}
          />
        ),
      },
      {
        id: "runs" as const,
        label: t("platform.workloads.tabRuns"),
        panel: (
          <RunsTab
            workloadId={workloadId}
            fanOutQueueId={fanOutQueueId}
            onSelectWorkload={onSelect}
          />
        ),
      },
      {
        id: "config" as const,
        label: t("platform.workloads.tabConfig"),
        panel: <ConfigTab workload={workload} />,
      },
    ];
  }, [
    workload,
    stats24h,
    relatedHandlers,
    parentLabels,
    onSelect,
    workloadId,
    t,
  ]);

  if (!workloadId) {
    if (catalogView) {
      return (
        <WorkloadCatalogPanel
          handlers={catalogHandlers}
          parentLabels={parentLabels}
          onSelect={onSelect}
          onSelectParent={onSelect}
        />
      );
    }
    return (
      <WorkloadSummaryPanel
        workloads={operationalWorkloads}
        onSelect={onSelect}
        onRefresh={onRefresh}
        isRefreshing={isRefreshing}
        lastUpdatedAt={lastUpdatedAt}
      />
    );
  }

  if (!workload) {
    return (
      <section
        className={cn(
          designerPreviewPanelShellClassName,
          designerPreviewPanelShellFillClassName,
        )}
      >
        <div className={cn(designerPreviewPanelBodyFillClassName, "p-4")}>
          <Text className="text-muted-foreground">Loading…</Text>
        </div>
      </section>
    );
  }

  return (
    <section
      className={cn(
        designerPreviewPanelShellClassName,
        designerPreviewPanelShellFillClassName,
      )}
    >
      <div className={cn(designerPreviewPanelHeaderClassName, "shrink-0")}>
        <div className="min-w-0 flex-1">
          <Heading level={2}>{workload.displayName}</Heading>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            {catalog ? (
              <CatalogHandlerBadge />
            ) : (
              <>
                <StatusBadge status={workload.state.status} />
                {isWorkloadBusy(workload) ? <BusyBadge /> : null}
              </>
            )}
            {workload.description ? (
              <Text className="text-muted-foreground text-sm">
                {workload.description}
              </Text>
            ) : null}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={onClearSelection}
          >
            <ArrowLeft aria-hidden className="mr-2 size-4" />
            {t(
              catalog
                ? "platform.workloads.backToCatalog"
                : "platform.workloads.backToOverview",
            )}
          </Button>
        </div>
      </div>
      <div className={cn(designerPreviewPanelBodyFillClassName, "min-h-0")}>
        <TabbedPanel
          ariaLabel="Workload detail tabs"
          activeTabId={activeTab}
          onTabChange={setActiveTab}
          tabs={tabs}
        />
      </div>
    </section>
  );
}
