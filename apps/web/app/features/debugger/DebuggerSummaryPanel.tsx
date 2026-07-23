import { Alert, Card, Heading, Text } from "@repo/ui";
import { cn } from "@repo/theme/utils";
import { Activity, AlertTriangle, BarChart3 } from "lucide-react";
import type { TFunction } from "i18next";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import type {
  DebugEvent,
  DebugEventSource,
  HookExecutionLiveCounts,
} from "../../lib/api-client";
import {
  HOOK_EXECUTION_LIVE_METRIC_KEYS,
  hookExecutionLiveMetricLabelKey,
} from "./hook-execution-live-metrics";
import {
  designerPreviewPanelBodyFillClassName,
  designerPreviewPanelHeaderClassName,
  designerPreviewPanelShellClassName,
  designerPreviewPanelShellFillClassName,
} from "../ui-builder/designer-tree-workbench-classes";
import {
  computeDebuggerSourceStats,
  type DebuggerBarChartStats,
  type DebuggerSourceStats,
} from "./compute-debugger-source-stats";
import { DebuggerStatusBadge } from "./components/DebuggerStatusBadge";
import {
  DebuggerLastUpdatedLabel,
  DebuggerRefreshButton,
  DebuggerRefreshingOverlay,
} from "./components/DebuggerRefreshControls";
import { DebuggerExpandableChartCard } from "./components/DebuggerExpandableChartCard";
import {
  DebuggerKpiStrip,
  type DebuggerKpiItem,
} from "./components/DebuggerKpiStrip";
import { DebuggerSectionHeading } from "./components/DebuggerSectionHeading";
import { DebuggerHorizontalBarChart } from "./components/charts/DebuggerHorizontalBarChart";
import { DebuggerTimelineChart } from "./components/charts/DebuggerTimelineChart";
import { useDebugger } from "./debugger-context";
import { debuggerSourceLabelKey } from "./debugger-source-config";
import { mapWindowSummaryToSourceStats } from "./map-window-summary-to-source-stats";
import {
  DEBUGGER_LIST_ROW_HOVER_CLASS,
  DEBUGGER_STATUS_ACCENT_CLASS,
} from "./debugger-status-styles";
import {
  DEBUGGER_CHART_CARD_CLASS,
  DEBUGGER_REFRESH_PULSE_CLASS,
} from "./debugger-summary-motion";
import {
  barChartLegendKey,
  barChartValueUnitKey,
  timelineChartLegendKey,
  timelineChartValueUnitKey,
} from "./debugger-chart-labels";
import { useDebuggerListQuery } from "./use-debugger-list-query";

const STATUS_KPI_KEYS = new Set([
  "success",
  "error",
  "skipped",
  "running",
  "pending",
  "failed",
  "completed",
  "info",
  "errors",
]);

function formatSharePercent(count: number, total: number): string | undefined {
  if (total <= 0 || count <= 0) {
    return undefined;
  }
  return `${Math.round((count / total) * 100)}%`;
}

function withStatusSharePercents(
  items: DebuggerKpiItem[],
  total: number,
): DebuggerKpiItem[] {
  return items.map((item) => {
    if (!STATUS_KPI_KEYS.has(item.key) || typeof item.value !== "number") {
      return item;
    }

    const subValue = formatSharePercent(item.value, total);
    return subValue ? { ...item, subValue } : item;
  });
}

function formatMs(value: number | null): string {
  return value == null ? "—" : `${value}ms`;
}

function formatPercent(value: number | null): string {
  return value == null ? "—" : `${value}%`;
}

function mapBarChartItems(chart: DebuggerBarChartStats) {
  return chart.groups.map((group) => ({
    key: group.key,
    label: group.label,
    value: group.count,
  }));
}

function buildKpiItems(
  stats: DebuggerSourceStats,
  activeSource: DebugEventSource,
  t: TFunction<"common">,
  hookExecutionLive?: HookExecutionLiveCounts | null,
): DebuggerKpiItem[] {
  const items: DebuggerKpiItem[] = [
    {
      key: "total",
      label: t("debugger.summary.totalRecords"),
      value: stats.total,
    },
  ];

  switch (activeSource) {
    case "hookExecution":
      if (hookExecutionLive) {
        for (const key of HOOK_EXECUTION_LIVE_METRIC_KEYS) {
          items.push({
            key,
            label: t(hookExecutionLiveMetricLabelKey(key)),
            value: hookExecutionLive[key],
          });
        }
      } else {
        items.push(
          {
            key: "running",
            label: t("debugger.summary.running"),
            value: stats.statusCounts.running ?? 0,
          },
          {
            key: "pending",
            label: t("debugger.summary.queued"),
            value: stats.statusCounts.pending ?? 0,
          },
        );
      }
      items.push(
        {
          key: "success",
          label: t("debugger.summary.successes"),
          value: stats.statusCounts.success ?? 0,
        },
        {
          key: "error",
          label: t("debugger.summary.errors"),
          value: stats.statusCounts.error ?? 0,
        },
        {
          key: "skipped",
          label: t("debugger.summary.skipped"),
          value: stats.statusCounts.skipped ?? 0,
        },
        {
          key: "errorRate",
          label: t("debugger.summary.errorRate"),
          value: formatPercent(stats.errorRate),
        },
        {
          key: "avgDuration",
          label: t("debugger.summary.avgDuration"),
          value: formatMs(stats.avgDurationMs),
        },
        {
          key: "writesCreated",
          label: t("debugger.summary.writesCreated"),
          value: stats.writesCreated ?? 0,
        },
        {
          key: "writesUpdated",
          label: t("debugger.summary.writesUpdated"),
          value: stats.writesUpdated ?? 0,
        },
        {
          key: "writesDeleted",
          label: t("debugger.summary.writesDeleted"),
          value: stats.writesDeleted ?? 0,
        },
        {
          key: "totalWrites",
          label: t("debugger.summary.totalWrites"),
          value: stats.totalWrites ?? 0,
        },
      );
      break;
    case "hookLog":
      items.push(
        {
          key: "info",
          label: t("debugger.summary.info"),
          value: stats.statusCounts.info ?? 0,
        },
        {
          key: "error",
          label: t("debugger.summary.errors"),
          value: stats.statusCounts.error ?? 0,
        },
        {
          key: "errorRate",
          label: t("debugger.summary.errorRate"),
          value: formatPercent(stats.errorRate),
        },
      );
      break;
    case "ai":
      items.push(
        {
          key: "running",
          label: t("debugger.summary.running"),
          value: stats.statusCounts.running ?? 0,
        },
        {
          key: "pending",
          label: t("debugger.summary.pending"),
          value: stats.statusCounts.pending ?? 0,
        },
        {
          key: "failed",
          label: t("debugger.summary.failed"),
          value: stats.statusCounts.failed ?? 0,
        },
        {
          key: "completed",
          label: t("debugger.summary.completed"),
          value: stats.statusCounts.completed ?? 0,
        },
        {
          key: "errorRate",
          label: t("debugger.summary.errorRate"),
          value: formatPercent(stats.errorRate),
        },
      );
      break;
    case "emailIngest":
      items.push(
        {
          key: "running",
          label: t("debugger.summary.running"),
          value: stats.statusCounts.running ?? 0,
        },
        {
          key: "pending",
          label: t("debugger.summary.pending"),
          value: stats.statusCounts.pending ?? 0,
        },
        {
          key: "completed",
          label: t("debugger.summary.completed"),
          value: stats.statusCounts.completed ?? 0,
        },
        {
          key: "failed",
          label: t("debugger.summary.failed"),
          value: stats.statusCounts.failed ?? 0,
        },
        {
          key: "fetched",
          label: t("debugger.emailIngest.metrics.fetched"),
          value: stats.emailIngestFetched ?? 0,
        },
        {
          key: "queued",
          label: t("debugger.emailIngest.metrics.queued"),
          value: stats.emailIngestQueued ?? 0,
        },
        {
          key: "processing",
          label: t("debugger.emailIngest.metrics.processing"),
          value: stats.emailIngestProcessing ?? 0,
        },
        {
          key: "finished",
          label: t("debugger.emailIngest.metrics.finished"),
          value: stats.emailIngestFinished ?? 0,
        },
        {
          key: "processed",
          label: t("debugger.emailIngest.metrics.processed"),
          value: stats.emailIngestProcessed ?? 0,
        },
        {
          key: "failedMessages",
          label: t("debugger.emailIngest.metrics.failed"),
          value: stats.emailIngestFailedMessages ?? 0,
        },
      );
      break;
    case "audit":
      items.push({
        key: "actors",
        label: t("debugger.summary.uniqueActors"),
        value: stats.uniqueActors ?? "—",
      });
      break;
    case "requestPerf":
      items.push(
        {
          key: "errors",
          label: t("debugger.summary.errors"),
          value: stats.statusCounts.error ?? 0,
        },
        {
          key: "errorRate",
          label: t("debugger.summary.errorRate"),
          value: formatPercent(stats.errorRate),
        },
        {
          key: "avgTotal",
          label: t("debugger.summary.avgLatency"),
          value: formatMs(stats.avgTotalMs),
        },
        {
          key: "avgHooks",
          label: t("debugger.summary.avgHooksMs"),
          value: formatMs(stats.avgHooksMs),
        },
        {
          key: "avgQuery",
          label: t("debugger.summary.avgQueryMs"),
          value: formatMs(stats.avgQueryMs),
        },
      );
      break;
  }

  return withStatusSharePercents(items, stats.total);
}

function SummarySkeleton() {
  return (
    <div className="space-y-4">
      <div className="bg-muted/40 h-16 animate-pulse rounded-lg" />
      <div className="bg-muted/40 h-48 animate-pulse rounded-lg" />
      <div className="bg-muted/40 h-32 animate-pulse rounded-lg" />
    </div>
  );
}

function AttentionList({
  items,
  onSelect,
}: {
  readonly items: readonly DebugEvent[];
  readonly onSelect: (event: DebugEvent) => void;
}) {
  const { t } = useTranslation("common");

  if (items.length === 0) {
    return (
      <Text className="text-muted-foreground text-sm">
        {t("debugger.summary.noIssues")}
      </Text>
    );
  }

  return (
    <ul className="space-y-2">
      {items.map((event) => {
        const accentClass = event.status
          ? (DEBUGGER_STATUS_ACCENT_CLASS[event.status] ??
            "border-l-transparent")
          : "border-l-transparent";

        return (
          <li key={event.id}>
            <button
              type="button"
              className={cn(
                "flex w-full cursor-pointer items-start gap-3 rounded-md border-l-2 px-3 py-2 text-left transition-colors duration-150",
                accentClass,
                DEBUGGER_LIST_ROW_HOVER_CLASS,
              )}
              onClick={() => onSelect(event)}
            >
              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  {event.status ? (
                    <DebuggerStatusBadge status={event.status} size="compact" />
                  ) : null}
                  <Text className="break-words text-sm font-medium">
                    {event.title}
                  </Text>
                </div>
                <Text className="text-muted-foreground break-words text-xs">
                  {event.subtitle ?? event.timestamp}
                </Text>
              </div>
              <Text className="text-muted-foreground shrink-0 text-xs">
                {event.timestamp}
              </Text>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

export function DebuggerSummaryPanel() {
  const { t } = useTranslation("common");
  const {
    activeSource,
    sourceEvents,
    isLoading,
    refreshGeneration,
    selectRecord,
    hookExecutionLive,
    windowSummary,
    isSummaryLoading,
  } = useDebugger();
  const { hasActiveFilters } = useDebuggerListQuery(sourceEvents, activeSource);

  const stats = useMemo((): DebuggerSourceStats => {
    if (windowSummary) {
      return mapWindowSummaryToSourceStats(windowSummary);
    }
    return computeDebuggerSourceStats([], activeSource);
  }, [activeSource, windowSummary]);

  const kpiItems = useMemo(
    () => buildKpiItems(stats, activeSource, t, hookExecutionLive),
    [activeSource, hookExecutionLive, stats, t],
  );

  const liveKpiItems = useMemo(
    () =>
      activeSource === "hookExecution"
        ? kpiItems.filter((item) =>
            HOOK_EXECUTION_LIVE_METRIC_KEYS.includes(
              item.key as (typeof HOOK_EXECUTION_LIVE_METRIC_KEYS)[number],
            ),
          )
        : [],
    [activeSource, kpiItems],
  );

  const mainKpiItems = useMemo(
    () =>
      activeSource === "hookExecution"
        ? kpiItems.filter(
            (item) =>
              !HOOK_EXECUTION_LIVE_METRIC_KEYS.includes(
                item.key as (typeof HOOK_EXECUTION_LIVE_METRIC_KEYS)[number],
              ),
          )
        : kpiItems,
    [activeSource, kpiItems],
  );

  const hasLiveHookExecutions =
    hookExecutionLive != null &&
    (hookExecutionLive.pending > 0 || hookExecutionLive.running > 0);

  const hasData = (windowSummary?.total ?? 0) > 0;
  const showInitialSkeleton =
    (isLoading || isSummaryLoading) && !hasData && !windowSummary;
  const [pulseActive, setPulseActive] = useState(false);

  useEffect(() => {
    if (refreshGeneration === 0) {
      return;
    }
    setPulseActive(true);
    const timeoutId = window.setTimeout(() => setPulseActive(false), 600);
    return () => window.clearTimeout(timeoutId);
  }, [refreshGeneration]);

  const emptyMessage = t("debugger.list.emptySource");

  const attentionEvents = useMemo((): DebugEvent[] => {
    return stats.attentionItems.map((item) => ({
      id: item.id,
      source: item.source,
      title: item.title,
      timestamp: item.timestamp,
      ...(item.status ? { status: item.status } : {}),
      ...(item.subtitle ? { subtitle: item.subtitle } : {}),
    }));
  }, [stats.attentionItems]);

  return (
    <section
      className={cn(
        designerPreviewPanelShellClassName,
        designerPreviewPanelShellFillClassName,
      )}
    >
      <div className={cn(designerPreviewPanelHeaderClassName, "shrink-0")}>
        <div className="min-w-0 flex-1">
          <Heading level={2}>{t("debugger.summary.title")}</Heading>
          <Text className="text-muted-foreground mt-1 text-sm">
            {t("debugger.summary.subtitle", {
              source: t(debuggerSourceLabelKey(activeSource)),
            })}
          </Text>
          <DebuggerLastUpdatedLabel className="mt-1" />
        </div>
        <DebuggerRefreshButton />
      </div>

      <div className={cn(designerPreviewPanelBodyFillClassName, "relative")}>
        <DebuggerRefreshingOverlay />
        {showInitialSkeleton ? (
          <SummarySkeleton />
        ) : !hasData ? (
          <Text className="text-muted-foreground text-sm">{emptyMessage}</Text>
        ) : (
          <div className="space-y-4">
            {stats.inProgressCount > 0 || hasLiveHookExecutions ? (
              <Alert>{t("debugger.summary.inProgressBanner")}</Alert>
            ) : null}

            <DebuggerKpiStrip
              items={mainKpiItems}
              className={cn(pulseActive && DEBUGGER_REFRESH_PULSE_CLASS)}
            />

            {activeSource === "hookExecution" &&
            stats.writeExecutionCount != null &&
            stats.totalWrites != null ? (
              <div className="space-y-1">
                <Text className="text-muted-foreground text-xs">
                  {t("debugger.summary.writesAcrossExecutions", {
                    total: stats.totalWrites,
                    count: stats.writeExecutionCount,
                  })}
                </Text>
              </div>
            ) : null}

            {liveKpiItems.length > 0 ? (
              <DebuggerKpiStrip items={liveKpiItems} />
            ) : null}

            <div className="flex gap-3 overflow-x-auto pb-1">
              {stats.barCharts.map((chart) => {
                if (chart.groups.length === 0) {
                  return null;
                }

                const unitKey = barChartValueUnitKey(chart);
                const legendKey = barChartLegendKey(chart);
                const unitLabel = unitKey ? t(unitKey) : undefined;
                const legend = legendKey ? t(legendKey) : undefined;

                return (
                  <DebuggerExpandableChartCard
                    key={chart.id}
                    title={t(chart.titleKey)}
                    icon={BarChart3}
                    contentLayout="contain"
                    compactChart={
                      <DebuggerHorizontalBarChart
                        items={mapBarChartItems(chart)}
                        unitLabel={unitLabel}
                        legend={legend}
                      />
                    }
                    expandedChart={
                      <DebuggerHorizontalBarChart
                        items={mapBarChartItems(chart)}
                        unitLabel={unitLabel}
                        legend={legend}
                        layout="expanded"
                      />
                    }
                  />
                );
              })}

              {stats.timelineBuckets.some((bucket) => bucket.total > 0) ? (
                <DebuggerExpandableChartCard
                  title={t("debugger.summary.activityTimeline")}
                  icon={Activity}
                  className="min-w-[16rem] sm:min-w-[18rem]"
                  compactChart={
                    <DebuggerTimelineChart
                      buckets={stats.timelineBuckets}
                      ariaLabel={t("debugger.summary.activityTimeline")}
                      showErrors={
                        activeSource === "hookExecution" ||
                        activeSource === "requestPerf"
                      }
                      valueUnitLabel={t(
                        timelineChartValueUnitKey(activeSource),
                      )}
                      legend={t(timelineChartLegendKey())}
                    />
                  }
                  expandedChart={
                    <DebuggerTimelineChart
                      buckets={stats.timelineBuckets}
                      ariaLabel={t("debugger.summary.activityTimeline")}
                      showErrors={
                        activeSource === "hookExecution" ||
                        activeSource === "requestPerf"
                      }
                      size="large"
                      valueUnitLabel={t(
                        timelineChartValueUnitKey(activeSource),
                      )}
                      legend={t(timelineChartLegendKey())}
                    />
                  }
                />
              ) : null}
            </div>

            <Card className={cn("space-y-3 p-4", DEBUGGER_CHART_CARD_CLASS)}>
              <DebuggerSectionHeading icon={AlertTriangle}>
                {t("debugger.summary.needsAttention")}
              </DebuggerSectionHeading>
              <AttentionList items={attentionEvents} onSelect={selectRecord} />
            </Card>

            <div className="space-y-1">
              <Text className="text-muted-foreground text-xs">
                {windowSummary?.truncated
                  ? t("debugger.summary.windowSummaryTruncated", {
                      count: windowSummary.scannedCount,
                    })
                  : t("debugger.summary.windowSummary")}
              </Text>
              {hasActiveFilters ? (
                <Text className="text-muted-foreground text-xs">
                  {t("debugger.summary.overviewIgnoresListFilters")}
                </Text>
              ) : null}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
