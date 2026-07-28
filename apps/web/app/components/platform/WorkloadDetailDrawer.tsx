import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Alert,
  Button,
  Heading,
  Sheet,
  TabbedPanel,
  Text,
  type TabbedPanelTabId,
} from "@repo/ui";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import { ExternalLink } from "lucide-react";

import {
  getWorkload,
  getWorkloadRunLogs,
  getWorkloadRunTrace,
  listWorkloadRuns,
  type WorkloadRunRecord,
  type WorkloadWithState,
  type WorkloadStats24h,
} from "../../lib/admin-client";
import { StatusBadge, WorkloadActionButtons } from "./PlatformWorkloadsPanel";

// --- Overview Tab ---

function OverviewTab({
  workload,
  stats24h,
}: {
  readonly workload: WorkloadWithState;
  readonly stats24h?: WorkloadStats24h;
}) {
  const { t } = useTranslation("common");

  return (
    <div className="space-y-4 p-4">
      <div className="space-y-2">
        <Heading level={3}>{t("platform.workloads.overviewMetadata")}</Heading>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <Text className="text-muted-foreground">ID</Text>
          <Text className="font-mono text-xs">{workload.id}</Text>
          <Text className="text-muted-foreground">Kind</Text>
          <Text>{workload.kind}</Text>
          <Text className="text-muted-foreground">Source</Text>
          <Text>{workload.source}</Text>
          <Text className="text-muted-foreground">Status</Text>
          <StatusBadge status={workload.state.status} />
          {workload.route && (
            <>
              <Text className="text-muted-foreground">Route</Text>
              <Text className="font-mono text-xs">{workload.route}</Text>
            </>
          )}
          {workload.sourceFile && (
            <>
              <Text className="text-muted-foreground">Source File</Text>
              <Text className="font-mono text-xs">{workload.sourceFile}</Text>
            </>
          )}
          {workload.controlledBy && (
            <>
              <Text className="text-muted-foreground">Controlled By</Text>
              <Text>{workload.controlledBy}</Text>
            </>
          )}
        </div>
      </div>

      {workload.state.live &&
        Object.keys(workload.state.live).length > 0 && (
          <div className="space-y-2">
            <Heading level={3}>
              {t("platform.workloads.overviewLiveState")}
            </Heading>
            <pre className="bg-muted overflow-auto rounded-md p-3 text-xs">
              {JSON.stringify(workload.state.live, null, 2)}
            </pre>
          </div>
        )}

      {stats24h && (
        <div className="space-y-2">
          <Heading level={3}>
            {t("platform.workloads.overviewStats24h")}
          </Heading>
          <div className="grid grid-cols-5 gap-2 text-center">
            {(
              Object.entries(stats24h) as [
                keyof WorkloadStats24h,
                number,
              ][]
            ).map(([key, value]) => (
              <div key={key} className="space-y-1">
                <Text className="text-muted-foreground text-xs">{key}</Text>
                <Text className="text-lg font-semibold">{value}</Text>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-2">
        <Heading level={3}>{t("platform.workloads.columnActions")}</Heading>
        <WorkloadActionButtons workload={workload} />
      </div>
    </div>
  );
}

// --- Runs Tab ---

const RANGE_OPTIONS = [
  { key: "15m", ms: 15 * 60_000 },
  { key: "1h", ms: 60 * 60_000 },
  { key: "24h", ms: 24 * 60 * 60_000 },
  { key: "7d", ms: 7 * 24 * 60 * 60_000 },
] as const;

function RunStatusBar({
  runs,
}: {
  readonly runs: WorkloadRunRecord[];
}) {
  if (runs.length === 0) return null;

  const statusCounts: Record<string, number> = {};
  for (const r of runs) {
    statusCounts[r.status] = (statusCounts[r.status] ?? 0) + 1;
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
      {Object.entries(statusCounts).map(([s, count]) => (
        <div
          key={s}
          className={`${colorMap[s] ?? "bg-gray-300"}`}
          style={{ flex: count }}
          title={`${s}: ${count}`}
        />
      ))}
    </div>
  );
}

function RunsTab({ workloadId }: { readonly workloadId: string }) {
  const { t } = useTranslation("common");
  const [rangeKey, setRangeKey] = useState<string>("1h");
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);

  const range = RANGE_OPTIONS.find((r) => r.key === rangeKey) ?? RANGE_OPTIONS[1];
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
      <div className="flex gap-1">
        {RANGE_OPTIONS.map((opt) => (
          <Button
            key={opt.key}
            size="sm"
            variant={rangeKey === opt.key ? "primary" : "outline"}
            onClick={() => setRangeKey(opt.key)}
          >
            {t(`platform.workloads.runsRange${opt.key.charAt(0).toUpperCase() + opt.key.slice(1)}` as never)}
          </Button>
        ))}
      </div>

      <RunStatusBar runs={runs} />

      {runs.length === 0 ? (
        <Text className="text-muted-foreground py-4 text-center">
          {t("platform.workloads.runsEmpty")}
        </Text>
      ) : (
        <div className="max-h-[400px] overflow-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left">
                <th className="p-2">Started</th>
                <th className="p-2">Status</th>
                <th className="p-2">Duration</th>
                <th className="p-2">Triggered By</th>
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

// --- Run Detail Sub-Panel ---

function buildArtifactLink(
  key: string,
  value: string,
): { to: string; label: string } | null {
  if (key === "hookExecution" || value.startsWith("hookExecution:")) {
    const id = value.replace("hookExecution:", "");
    return {
      to: `/debugger/hook-executions?record=hookExecution:${id}`,
      label: "Hook Execution",
    };
  }
  if (key === "aiJob" || value.startsWith("aiJob:")) {
    const id = value.replace("aiJob:", "");
    return { to: `/debugger/ai-jobs?record=aiJob:${id}`, label: "AI Job" };
  }
  if (key === "emailIngestJob" || value.startsWith("emailIngestJob:")) {
    const id = value.replace("emailIngestJob:", "");
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
    refetchInterval: (query) =>
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

      {/* Header */}
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
        {run.durationMs != null && (
          <Text className="text-muted-foreground text-xs">
            {run.durationMs}ms
          </Text>
        )}
      </div>

      {/* Error */}
      {run.error && (
        <div className="space-y-1">
          <Heading level={3}>{t("platform.workloads.runDetailError")}</Heading>
          <Alert>{run.error}</Alert>
        </div>
      )}

      {/* Metrics */}
      {run.metrics && Object.keys(run.metrics).length > 0 && (
        <details className="space-y-1">
          <summary className="cursor-pointer text-sm font-medium">
            {t("platform.workloads.runDetailMetrics")}
          </summary>
          <pre className="bg-muted overflow-auto rounded-md p-2 text-xs">
            {JSON.stringify(run.metrics, null, 2)}
          </pre>
        </details>
      )}

      {/* Artifact links */}
      {run.artifactRefs && Object.keys(run.artifactRefs).length > 0 && (
        <div className="space-y-1">
          <Text className="text-sm font-medium">
            {t("platform.workloads.runDetailArtifacts")}
          </Text>
          <div className="flex flex-wrap gap-2">
            {Object.entries(run.artifactRefs).map(([key, value]) => {
              const link = buildArtifactLink(key, value);
              if (!link) {
                return (
                  <Text key={key} className="text-muted-foreground text-xs">
                    {key}: {value}
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
      )}

      {/* Trace tree */}
      {traceQuery.data && traceQuery.data.length > 1 && (
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
                  {tr.durationMs != null && (
                    <span className="text-muted-foreground">
                      {tr.durationMs}ms
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Logs */}
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <Text className="text-sm font-medium">
            {t("platform.workloads.runDetailLogs")}
          </Text>
          {logsQuery.data?.cloudLoggingUrl && (
            <a
              href={logsQuery.data.cloudLoggingUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary inline-flex items-center gap-1 text-xs underline"
            >
              {t("platform.workloads.openCloudLogging")}
              <ExternalLink className="h-3 w-3" />
            </a>
          )}
        </div>
        {logsQuery.data?.entries && logsQuery.data.entries.length > 0 ? (
          <pre className="bg-muted max-h-[200px] overflow-auto rounded-md p-2 font-mono text-xs">
            {logsQuery.data.entries.map((e) => (
              <div key={`${e.timestamp}-${e.message.slice(0, 20)}`}>
                <span className="text-muted-foreground">
                  {e.timestamp.slice(11, 23)}
                </span>{" "}
                {e.severity && (
                  <span
                    className={
                      e.severity === "ERROR"
                        ? "text-red-600"
                        : "text-muted-foreground"
                    }
                  >
                    [{e.severity}]{" "}
                  </span>
                )}
                {e.message}
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

// --- Config Tab ---

function ConfigTab({ workload }: { readonly workload: WorkloadWithState }) {
  const { t } = useTranslation("common");
  const { state: _state, ...record } = workload;

  return (
    <div className="p-4">
      <Heading level={3}>{t("platform.workloads.tabConfig")}</Heading>
      <pre className="bg-muted mt-2 overflow-auto rounded-md p-3 text-xs">
        {JSON.stringify(record, null, 2)}
      </pre>
    </div>
  );
}

// --- Drawer ---

export function WorkloadDetailDrawer({
  workloadId,
  onClose,
}: {
  readonly workloadId: string;
  readonly onClose: () => void;
}) {
  const { t } = useTranslation("common");
  const [activeTab, setActiveTab] = useState<TabbedPanelTabId>("overview");

  const detailQuery = useQuery({
    queryKey: ["platform-workload", workloadId],
    queryFn: () => getWorkload(workloadId),
  });

  const workload = detailQuery.data?.workload;
  const stats24h = detailQuery.data?.stats24h;

  return (
    <Sheet open onOpenChange={(open) => !open && onClose()} side="right">
      {!workload ? (
        <div className="p-4">
          <Text className="text-muted-foreground">Loading…</Text>
        </div>
      ) : (
        <div className="flex h-full flex-col overflow-hidden">
          <div className="border-b px-4 py-3">
            <Heading level={2}>{workload.displayName}</Heading>
            {workload.description && (
              <Text className="text-muted-foreground text-sm">
                {workload.description}
              </Text>
            )}
          </div>
          <div className="flex-1 overflow-auto">
            <TabbedPanel
              ariaLabel="Workload detail tabs"
              activeTabId={activeTab}
              onTabChange={setActiveTab}
              tabs={[
                {
                  id: "overview",
                  label: t("platform.workloads.tabOverview"),
                  panel: (
                    <OverviewTab workload={workload} stats24h={stats24h} />
                  ),
                },
                {
                  id: "runs",
                  label: t("platform.workloads.tabRuns"),
                  panel: <RunsTab workloadId={workloadId} />,
                },
                {
                  id: "config",
                  label: t("platform.workloads.tabConfig"),
                  panel: <ConfigTab workload={workload} />,
                },
              ]}
            />
          </div>
        </div>
      )}
    </Sheet>
  );
}
