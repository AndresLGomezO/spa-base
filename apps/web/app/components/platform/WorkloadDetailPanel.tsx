import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Alert,
  Button,
  Heading,
  TabbedPanel,
  Text,
  type TabbedPanelTabId,
} from "@repo/ui";
import { cn } from "@repo/theme/utils";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import { ArrowLeft, ExternalLink } from "lucide-react";

import {
  getWorkload,
  getWorkloadRunLogs,
  getWorkloadRunTrace,
  listWorkloadRuns,
  type WorkloadRunArtifactRef,
  type WorkloadRunRecord,
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
  CatalogHandlerBadge,
  WorkloadActionButtons,
  handlersControlledBy,
  isCatalogWorkload,
  kindLabelKey,
  domainLabelKey,
  frequencyLabelKey,
  classifyWorkloadSchedule,
  formatScheduleClock,
  formatAbsoluteRunAt,
  formatCountdown,
  resolveWorkloadScheduleTiming,
} from "./workload-ui-shared";
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
              <StatusBadge status={workload.state.status} />
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

const RANGE_OPTIONS = [
  { key: "15m", ms: 15 * 60_000 },
  { key: "1h", ms: 60 * 60_000 },
  { key: "24h", ms: 24 * 60 * 60_000 },
  { key: "7d", ms: 7 * 24 * 60 * 60_000 },
] as const;

function RunStatusBar({ runs }: { readonly runs: WorkloadRunRecord[] }) {
  if (runs.length === 0) return null;

  const statusCounts: Record<string, number> = {};
  for (const run of runs) {
    statusCounts[run.status] = (statusCounts[run.status] ?? 0) + 1;
  }

  const colorMap: Record<string, string> = {
    success: "bg-green-500",
    error: "bg-red-500",
    timeout: "bg-orange-500",
    running: "bg-blue-500",
    cancelled: "bg-gray-400",
  };

  return (
    <div className="flex h-3 w-full overflow-hidden rounded-full">
      {Object.entries(statusCounts).map(([status, count]) => (
        <div
          key={status}
          className={`${colorMap[status] ?? "bg-gray-300"}`}
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
  const [rangeKey, setRangeKey] = useState<string>("24h");
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);

  const range =
    RANGE_OPTIONS.find((option) => option.key === rangeKey) ?? RANGE_OPTIONS[2];
  const since = new Date(Date.now() - range.ms).toISOString();

  const runsQuery = useQuery({
    queryKey: ["platform-workload-runs", workloadId, rangeKey],
    queryFn: () => listWorkloadRuns(workloadId, { since, limit: 100 }),
    refetchInterval: 10_000,
  });

  const runs = runsQuery.data?.items ?? [];

  if (selectedRunId) {
    return (
      <RunDetailSubPanel
        workloadId={workloadId}
        runId={selectedRunId}
        onBack={() => setSelectedRunId(null)}
      />
    );
  }

  return (
    <div className="space-y-3 p-4">
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
      <div className="flex gap-1">
        {RANGE_OPTIONS.map((opt) => (
          <Button
            key={opt.key}
            size="sm"
            variant={rangeKey === opt.key ? "primary" : "outline"}
            onClick={() => setRangeKey(opt.key)}
          >
            {t(
              `platform.workloads.runsRange${opt.key.charAt(0).toUpperCase()}${opt.key.slice(1)}` as never,
            )}
          </Button>
        ))}
      </div>

      <RunStatusBar runs={runs} />

      {runsQuery.isError ? (
        <Alert>{t("platform.workloads.runsLoadFailed")}</Alert>
      ) : runs.length === 0 ? (
        <Text className="text-muted-foreground py-4 text-center">
          {t("platform.workloads.runsEmpty")}
        </Text>
      ) : (
        <div className="max-h-[400px] overflow-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left">
                <th className="p-2">
                  {t("platform.workloads.runsColStarted")}
                </th>
                <th className="p-2">
                  {t("platform.workloads.runsColWorkload")}
                </th>
                <th className="p-2">{t("platform.workloads.runsColStatus")}</th>
                <th className="p-2">
                  {t("platform.workloads.runsColDuration")}
                </th>
                <th className="p-2">
                  {t("platform.workloads.runsColTriggeredBy")}
                </th>
              </tr>
            </thead>
            <tbody>
              {runs.map((run) => (
                <tr
                  key={run.id}
                  className="hover:bg-muted/50 cursor-pointer border-b"
                  onClick={() => setSelectedRunId(run.id)}
                >
                  <td className="p-2 font-mono text-xs">
                    {new Date(run.startedAt).toLocaleString()}
                  </td>
                  <td className="p-2 font-mono text-xs">{run.workloadId}</td>
                  <td className="p-2">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                        run.status === "success"
                          ? "bg-green-100 text-green-800"
                          : run.status === "error"
                            ? "bg-red-100 text-red-800"
                            : run.status === "running"
                              ? "bg-blue-100 text-blue-800"
                              : "bg-gray-100 text-gray-800"
                      }`}
                    >
                      {run.status}
                    </span>
                  </td>
                  <td className="text-muted-foreground p-2 text-xs">
                    {run.durationMs != null ? `${run.durationMs}ms` : "—"}
                  </td>
                  <td className="text-muted-foreground p-2 text-xs">
                    {run.triggeredBy}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
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
        <span
          className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
            run.status === "success"
              ? "bg-green-100 text-green-800"
              : run.status === "error"
                ? "bg-red-100 text-red-800"
                : run.status === "running"
                  ? "bg-blue-100 text-blue-800"
                  : "bg-gray-100 text-gray-800"
          }`}
        >
          {run.status}
        </span>
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
              <StatusBadge status={workload.state.status} />
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
