import { Alert, Button, Card, Heading, Text } from "@repo/ui";
import { cn } from "@repo/theme/utils";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  PieChart,
  RefreshCw,
} from "lucide-react";
import type { TFunction } from "i18next";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";

import type {
  DebugEvent,
  DebugEventSource,
  DebugEventStatus,
} from "../../lib/api-client";
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
import {
  DebuggerStatusBadge,
  debuggerStatusLabelKey,
} from "./components/DebuggerStatusBadge";
import { DebuggerExpandableChartCard } from "./components/DebuggerExpandableChartCard";
import {
  DebuggerKpiStrip,
  type DebuggerKpiItem,
} from "./components/DebuggerKpiStrip";
import { DebuggerSectionHeading } from "./components/DebuggerSectionHeading";
import {
  DebuggerDonutChart,
  type DebuggerDonutSegment,
} from "./components/charts/DebuggerDonutChart";
import { DebuggerHorizontalBarChart } from "./components/charts/DebuggerHorizontalBarChart";
import { DebuggerTimelineChart } from "./components/charts/DebuggerTimelineChart";
import { useDebugger } from "./debugger-context";
import { debuggerSourceLabelKey } from "./debugger-source-config";
import {
  DEBUGGER_LIST_ROW_HOVER_CLASS,
  DEBUGGER_STATUSES_BY_SOURCE,
  DEBUGGER_STATUS_ACCENT_CLASS,
} from "./debugger-status-styles";
import { DEBUGGER_CHART_CARD_CLASS } from "./debugger-summary-motion";
import { useDebuggerListQuery } from "./use-debugger-list-query";

const DONUT_STROKE_CLASS: Record<string, string> = {
  success: "stroke-success",
  completed: "stroke-success",
  error: "stroke-destructive",
  failed: "stroke-destructive",
  skipped: "stroke-muted-foreground",
  info: "stroke-info",
  running: "stroke-warning",
  pending: "stroke-warning",
};

function formatMs(value: number | null): string {
  return value == null ? "—" : `${value}ms`;
}

function formatPercent(value: number | null): string {
  return value == null ? "—" : `${value}%`;
}

function DonutCenter({
  total,
  label,
  expanded = false,
}: {
  readonly total: number;
  readonly label: string;
  readonly expanded?: boolean;
}) {
  return (
    <div className="space-y-0.5 px-2 text-center">
      <Text
        className={cn(
          "font-semibold tabular-nums",
          expanded ? "text-3xl" : "text-xl",
        )}
      >
        {total}
      </Text>
      <Text className="text-muted-foreground text-xs">{label}</Text>
    </div>
  );
}

function mapBarChartItems(
  chart: DebuggerBarChartStats,
  activeSource: DebugEventSource,
) {
  return chart.groups.map((group) => ({
    key: group.key,
    label: group.label,
    value: group.count,
    suffix:
      activeSource === "requestPerf" && chart.id === "routes"
        ? "ms"
        : undefined,
  }));
}

function buildDonutSegments(
  statusCounts: Partial<Record<DebugEventStatus, number>>,
  activeSource: DebugEventSource,
  t: TFunction<"common">,
): DebuggerDonutSegment[] {
  return DEBUGGER_STATUSES_BY_SOURCE[activeSource].map((status) => ({
    label: t(debuggerStatusLabelKey(status)),
    value: statusCounts[status] ?? 0,
    className: DONUT_STROKE_CLASS[status],
  }));
}

function buildKpiItems(
  stats: DebuggerSourceStats,
  activeSource: DebugEventSource,
  t: TFunction<"common">,
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

  return items;
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
  const { activeSource, sourceEvents, isLoading, refresh, selectRecord } =
    useDebugger();
  const { listEvents, hasActiveFilters } = useDebuggerListQuery(
    sourceEvents,
    activeSource,
  );

  const stats = useMemo(
    () => computeDebuggerSourceStats(listEvents, activeSource),
    [activeSource, listEvents],
  );

  const donutSegments = useMemo(
    () => buildDonutSegments(stats.statusCounts, activeSource, t),
    [activeSource, stats.statusCounts, t],
  );

  const kpiItems = useMemo(
    () => buildKpiItems(stats, activeSource, t),
    [activeSource, stats, t],
  );

  const emptyMessage =
    sourceEvents.length === 0
      ? t("debugger.list.emptySource")
      : t("debugger.list.emptyFiltered");

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
        </div>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={refresh}
          disabled={isLoading}
        >
          <RefreshCw
            aria-hidden
            className={`mr-2 size-4 ${isLoading ? "animate-spin" : ""}`}
          />
          {t("debugger.actions.refresh")}
        </Button>
      </div>

      <div className={designerPreviewPanelBodyFillClassName}>
        {isLoading ? (
          <SummarySkeleton />
        ) : listEvents.length === 0 ? (
          <Text className="text-muted-foreground text-sm">{emptyMessage}</Text>
        ) : (
          <div className="space-y-4">
            {stats.inProgressCount > 0 ? (
              <Alert>{t("debugger.summary.inProgressBanner")}</Alert>
            ) : null}

            <DebuggerKpiStrip items={kpiItems} />

            <div className="flex gap-3 overflow-x-auto pb-1">
              <DebuggerExpandableChartCard
                title={t("debugger.summary.statusDistribution")}
                icon={PieChart}
                contentLayout="contain"
                compactChart={
                  <DebuggerDonutChart
                    segments={donutSegments}
                    ariaLabel={t("debugger.summary.statusDistribution")}
                    size="default"
                    center={
                      <DonutCenter
                        total={stats.total}
                        label={t("debugger.summary.totalLabel")}
                      />
                    }
                  />
                }
                expandedChart={
                  <DebuggerDonutChart
                    segments={donutSegments}
                    ariaLabel={t("debugger.summary.statusDistribution")}
                    layout="expanded"
                    center={
                      <DonutCenter
                        total={stats.total}
                        label={t("debugger.summary.totalLabel")}
                        expanded
                      />
                    }
                  />
                }
              />

              {stats.barCharts.map((chart) =>
                chart.groups.length > 0 ? (
                  <DebuggerExpandableChartCard
                    key={chart.id}
                    title={t(chart.titleKey)}
                    icon={BarChart3}
                    contentLayout="contain"
                    compactChart={
                      <DebuggerHorizontalBarChart
                        items={mapBarChartItems(chart, activeSource)}
                      />
                    }
                    expandedChart={
                      <DebuggerHorizontalBarChart
                        items={mapBarChartItems(chart, activeSource)}
                        layout="expanded"
                      />
                    }
                  />
                ) : null,
              )}

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
                    />
                  }
                />
              ) : null}
            </div>

            <Card className={cn("space-y-3 p-4", DEBUGGER_CHART_CARD_CLASS)}>
              <DebuggerSectionHeading icon={AlertTriangle}>
                {t("debugger.summary.needsAttention")}
              </DebuggerSectionHeading>
              <AttentionList
                items={stats.attentionItems}
                onSelect={selectRecord}
              />
            </Card>

            <div className="space-y-1">
              <Text className="text-muted-foreground text-xs">
                {t("debugger.summary.sampleLimit")}
              </Text>
              {hasActiveFilters ? (
                <Text className="text-muted-foreground text-xs">
                  {t("debugger.summary.filteredNote")}
                </Text>
              ) : null}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
