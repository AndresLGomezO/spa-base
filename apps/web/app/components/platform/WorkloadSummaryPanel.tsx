import { Alert, Button, Card, Heading, Text } from "@repo/ui";
import { cn } from "@repo/theme/utils";
import {
  Activity,
  AlertTriangle,
  Layers,
  RefreshCw,
  Server,
  Tags,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import type {
  WorkloadKind,
  WorkloadSource,
  WorkloadStatus,
  WorkloadWithState,
} from "../../lib/admin-client";
import {
  designerPreviewPanelBodyFillClassName,
  designerPreviewPanelHeaderClassName,
  designerPreviewPanelShellClassName,
  designerPreviewPanelShellFillClassName,
} from "../../features/ui-builder/designer-tree-workbench-classes";
import {
  DebuggerKpiStrip,
  type DebuggerKpiItem,
} from "../../features/debugger/components/DebuggerKpiStrip";
import { DebuggerSectionHeading } from "../../features/debugger/components/DebuggerSectionHeading";
import { DebuggerExpandableChartCard } from "../../features/debugger/components/DebuggerExpandableChartCard";
import { DebuggerHorizontalBarChart } from "../../features/debugger/components/charts/DebuggerHorizontalBarChart";
import {
  DEBUGGER_CHART_CARD_CLASS,
  DEBUGGER_REFRESH_PULSE_CLASS,
} from "../../features/debugger/debugger-summary-motion";
import { DEBUGGER_LIST_ROW_HOVER_CLASS } from "../../features/debugger/debugger-status-styles";
import {
  ALL_WORKLOAD_SOURCES,
  OPERATIONAL_WORKLOAD_KINDS,
  WORKLOAD_STATUS_ACCENT_CLASS,
  StatusBadge,
  kindLabelKey,
} from "./workload-ui-shared";

function formatSharePercent(count: number, total: number): string | undefined {
  if (total <= 0 || count <= 0) return undefined;
  return `${Math.round((count / total) * 100)}%`;
}

function formatRelativeTime(timestampMs: number, locale: string): string {
  const deltaMs = timestampMs - Date.now();
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });
  const absSeconds = Math.round(Math.abs(deltaMs) / 1000);
  if (absSeconds < 60) {
    return rtf.format(Math.round(deltaMs / 1000), "second");
  }
  const absMinutes = Math.round(absSeconds / 60);
  if (absMinutes < 60) {
    return rtf.format(Math.round(deltaMs / 60_000), "minute");
  }
  const absHours = Math.round(absMinutes / 60);
  if (absHours < 24) {
    return rtf.format(Math.round(deltaMs / 3_600_000), "hour");
  }
  return rtf.format(Math.round(deltaMs / 86_400_000), "day");
}

function AttentionList({
  items,
  onSelect,
}: {
  readonly items: readonly WorkloadWithState[];
  readonly onSelect: (id: string) => void;
}) {
  const { t } = useTranslation("common");

  if (items.length === 0) {
    return (
      <Text className="text-muted-foreground text-sm">
        {t("platform.workloads.summaryNoIssues")}
      </Text>
    );
  }

  return (
    <ul className="space-y-2">
      {items.map((workload) => {
        const accentClass =
          WORKLOAD_STATUS_ACCENT_CLASS[workload.state.status] ??
          "border-l-transparent";
        return (
          <li key={workload.id}>
            <button
              type="button"
              className={cn(
                "flex w-full cursor-pointer items-start gap-3 rounded-md border-l-2 px-3 py-2 text-left transition-colors duration-150",
                accentClass,
                DEBUGGER_LIST_ROW_HOVER_CLASS,
              )}
              onClick={() => onSelect(workload.id)}
            >
              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge status={workload.state.status} size="compact" />
                  <Text className="break-words text-sm font-medium">
                    {workload.displayName}
                  </Text>
                </div>
                <Text className="text-muted-foreground break-words text-xs">
                  {t(kindLabelKey(workload.kind) as never)} ·{" "}
                  {t(
                    `platform.workloads.source${workload.source.charAt(0).toUpperCase()}${workload.source.slice(1)}` as never,
                  )}
                  {workload.description ? ` — ${workload.description}` : ""}
                </Text>
              </div>
              <Text className="text-muted-foreground shrink-0 text-xs">
                {workload.state.fetchedAt
                  ? new Date(workload.state.fetchedAt).toLocaleTimeString()
                  : "—"}
              </Text>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

export function WorkloadSummaryPanel({
  workloads,
  onSelect,
  onRefresh,
  isRefreshing,
  lastUpdatedAt,
}: {
  readonly workloads: readonly WorkloadWithState[];
  readonly onSelect: (id: string) => void;
  readonly onRefresh?: () => void;
  readonly isRefreshing?: boolean;
  readonly lastUpdatedAt?: number | null;
}) {
  const { t, i18n } = useTranslation("common");
  const [pulseActive, setPulseActive] = useState(false);
  const [, tick] = useState(0);

  useEffect(() => {
    if (!isRefreshing) return;
    setPulseActive(true);
    const timeoutId = window.setTimeout(() => setPulseActive(false), 600);
    return () => window.clearTimeout(timeoutId);
  }, [isRefreshing, lastUpdatedAt]);

  useEffect(() => {
    if (lastUpdatedAt == null) return;
    const intervalId = window.setInterval(() => {
      tick((current) => current + 1);
    }, 5_000);
    return () => window.clearInterval(intervalId);
  }, [lastUpdatedAt]);

  const stats = useMemo(() => {
    const byStatus: Record<WorkloadStatus, number> = {
      running: 0,
      scheduled: 0,
      ready: 0,
      paused: 0,
      disabled: 0,
      unknown: 0,
    };
    const byKind: Record<WorkloadKind, number> = {
      cloudTasksQueue: 0,
      schedulerJob: 0,
      pubsubSubscription: 0,
      scheduledDataHook: 0,
      workerRoute: 0,
      inProcessScheduler: 0,
    };
    const bySource: Record<WorkloadSource, number> = {
      system: 0,
      hook: 0,
      integration: 0,
    };
    let withActions = 0;
    for (const workload of workloads) {
      byStatus[workload.state.status] += 1;
      byKind[workload.kind] += 1;
      bySource[workload.source] += 1;
      if (workload.actions.length > 0) withActions += 1;
    }
    return { byStatus, byKind, bySource, withActions, total: workloads.length };
  }, [workloads]);

  const kpiItems = useMemo((): DebuggerKpiItem[] => {
    const total = stats.total;
    const items: DebuggerKpiItem[] = [
      {
        key: "total",
        label: t("platform.workloads.summaryTotal"),
        value: stats.total,
      },
      {
        key: "success",
        label: t("platform.workloads.statusRunning"),
        value: stats.byStatus.running,
        subValue: formatSharePercent(stats.byStatus.running, total),
      },
      {
        key: "info",
        label: t("platform.workloads.statusScheduled"),
        value: stats.byStatus.scheduled,
        subValue: formatSharePercent(stats.byStatus.scheduled, total),
      },
      {
        key: "queuedPending",
        label: t("platform.workloads.statusReady"),
        value: stats.byStatus.ready,
        subValue: formatSharePercent(stats.byStatus.ready, total),
      },
      {
        key: "pending",
        label: t("platform.workloads.statusPaused"),
        value: stats.byStatus.paused,
        subValue: formatSharePercent(stats.byStatus.paused, total),
      },
      {
        key: "failed",
        label: t("platform.workloads.statusDisabled"),
        value: stats.byStatus.disabled,
        subValue: formatSharePercent(stats.byStatus.disabled, total),
      },
      {
        key: "skipped",
        label: t("platform.workloads.statusUnknown"),
        value: stats.byStatus.unknown,
        subValue: formatSharePercent(stats.byStatus.unknown, total),
      },
      {
        key: "actors",
        label: t("platform.workloads.summaryWithActions"),
        value: stats.withActions,
        subValue: formatSharePercent(stats.withActions, total),
      },
    ];
    return items;
  }, [stats, t]);

  const kindChartItems = useMemo(
    () =>
      OPERATIONAL_WORKLOAD_KINDS.filter((kind) => stats.byKind[kind] > 0).map(
        (kind) => ({
          key: kind,
          label: t(kindLabelKey(kind) as never),
          value: stats.byKind[kind],
        }),
      ),
    [stats.byKind, t],
  );

  const sourceChartItems = useMemo(
    () =>
      ALL_WORKLOAD_SOURCES.filter((source) => stats.bySource[source] > 0).map(
        (source) => ({
          key: source,
          label: t(
            `platform.workloads.source${source.charAt(0).toUpperCase()}${source.slice(1)}` as never,
          ),
          value: stats.bySource[source],
        }),
      ),
    [stats.bySource, t],
  );

  const statusChartItems = useMemo(
    () =>
      (
        [
          "running",
          "scheduled",
          "ready",
          "paused",
          "disabled",
          "unknown",
        ] as const satisfies readonly WorkloadStatus[]
      )
        .filter((status) => stats.byStatus[status] > 0)
        .map((status) => ({
          key: status,
          label: t(
            `platform.workloads.status${status.charAt(0).toUpperCase()}${status.slice(1)}` as never,
          ),
          value: stats.byStatus[status],
        })),
    [stats.byStatus, t],
  );

  const needsAttention = useMemo(
    () =>
      workloads.filter((workload) =>
        ["paused", "disabled", "unknown"].includes(workload.state.status),
      ),
    [workloads],
  );

  const relativeTime =
    lastUpdatedAt != null
      ? formatRelativeTime(lastUpdatedAt, i18n?.language ?? "en")
      : null;

  return (
    <section
      className={cn(
        designerPreviewPanelShellClassName,
        designerPreviewPanelShellFillClassName,
      )}
    >
      <div className={cn(designerPreviewPanelHeaderClassName, "shrink-0")}>
        <div className="min-w-0 flex-1">
          <Heading level={2}>{t("platform.workloads.summaryTitle")}</Heading>
          <Text className="text-muted-foreground mt-1 text-sm">
            {t("platform.workloads.summarySubtitle")}
          </Text>
          {relativeTime && onRefresh ? (
            <button
              type="button"
              className="text-muted-foreground hover:text-foreground mt-1 inline-flex items-center gap-1.5 text-xs transition-colors"
              onClick={onRefresh}
              disabled={isRefreshing}
              aria-label={t("platform.workloads.summaryUpdatedRefreshAria", {
                time: relativeTime,
              })}
            >
              <RefreshCw
                aria-hidden
                className={cn(
                  "size-3.5 shrink-0",
                  isRefreshing && "animate-spin motion-reduce:animate-none",
                )}
              />
              <span>
                {t("platform.workloads.summaryUpdatedRefresh", {
                  time: relativeTime,
                })}
              </span>
            </button>
          ) : null}
        </div>
        {onRefresh ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={onRefresh}
            disabled={isRefreshing}
          >
            <RefreshCw
              aria-hidden
              className={cn(
                "mr-2 size-4",
                isRefreshing && "animate-spin motion-reduce:animate-none",
              )}
            />
            {t("platform.workloads.refresh")}
          </Button>
        ) : null}
      </div>

      <div className={cn(designerPreviewPanelBodyFillClassName, "relative")}>
        {workloads.length === 0 ? (
          <Text className="text-muted-foreground text-sm">
            {t("platform.workloads.empty")}
          </Text>
        ) : (
          <div className="space-y-4">
            {needsAttention.length > 0 ? (
              <Alert>
                {t("platform.workloads.summaryAttentionBanner", {
                  count: needsAttention.length,
                })}
              </Alert>
            ) : null}

            <DebuggerKpiStrip
              items={kpiItems}
              className={cn(pulseActive && DEBUGGER_REFRESH_PULSE_CLASS)}
            />

            <div className="flex gap-3 overflow-x-auto pb-1">
              {kindChartItems.length > 0 ? (
                <DebuggerExpandableChartCard
                  title={t("platform.workloads.summaryByKind")}
                  icon={Layers}
                  contentLayout="contain"
                  compactChart={
                    <DebuggerHorizontalBarChart
                      items={kindChartItems}
                      unitLabel={t("platform.workloads.summaryChartUnit")}
                      legend={t("platform.workloads.summaryByKindLegend")}
                    />
                  }
                  expandedChart={
                    <DebuggerHorizontalBarChart
                      items={kindChartItems}
                      unitLabel={t("platform.workloads.summaryChartUnit")}
                      legend={t("platform.workloads.summaryByKindLegend")}
                      layout="expanded"
                    />
                  }
                />
              ) : null}

              {sourceChartItems.length > 0 ? (
                <DebuggerExpandableChartCard
                  title={t("platform.workloads.summaryBySource")}
                  icon={Server}
                  contentLayout="contain"
                  compactChart={
                    <DebuggerHorizontalBarChart
                      items={sourceChartItems}
                      unitLabel={t("platform.workloads.summaryChartUnit")}
                      legend={t("platform.workloads.summaryBySourceLegend")}
                    />
                  }
                  expandedChart={
                    <DebuggerHorizontalBarChart
                      items={sourceChartItems}
                      unitLabel={t("platform.workloads.summaryChartUnit")}
                      legend={t("platform.workloads.summaryBySourceLegend")}
                      layout="expanded"
                    />
                  }
                />
              ) : null}

              {statusChartItems.length > 0 ? (
                <DebuggerExpandableChartCard
                  title={t("platform.workloads.summaryByStatus")}
                  icon={Tags}
                  contentLayout="contain"
                  compactChart={
                    <DebuggerHorizontalBarChart
                      items={statusChartItems}
                      unitLabel={t("platform.workloads.summaryChartUnit")}
                      legend={t("platform.workloads.summaryByStatusLegend")}
                    />
                  }
                  expandedChart={
                    <DebuggerHorizontalBarChart
                      items={statusChartItems}
                      unitLabel={t("platform.workloads.summaryChartUnit")}
                      legend={t("platform.workloads.summaryByStatusLegend")}
                      layout="expanded"
                    />
                  }
                />
              ) : null}
            </div>

            <Card className={cn("space-y-3 p-4", DEBUGGER_CHART_CARD_CLASS)}>
              <DebuggerSectionHeading icon={AlertTriangle}>
                {t("platform.workloads.summaryNeedsAttention")}
              </DebuggerSectionHeading>
              <AttentionList items={needsAttention} onSelect={onSelect} />
            </Card>

            <div className="space-y-1">
              <Text className="text-muted-foreground text-xs">
                {t("platform.workloads.summaryFootnote")}
              </Text>
              {stats.byStatus.running > 0 ? (
                <div className="text-muted-foreground flex items-center gap-1.5 text-xs">
                  <Activity aria-hidden className="size-3.5 shrink-0" />
                  {t("platform.workloads.summaryRunningHint", {
                    count: stats.byStatus.running,
                  })}
                </div>
              ) : null}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
