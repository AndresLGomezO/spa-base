import type { DebugEventSource } from "../../lib/api-client";

import type { DebuggerBarChartStats } from "./compute-debugger-source-stats";

type DebuggerChartUnitKey =
  | "debugger.chart.unit.writes"
  | "debugger.chart.unit.milliseconds"
  | "debugger.chart.unit.executions"
  | "debugger.chart.unit.errors"
  | "debugger.chart.unit.requests"
  | "debugger.chart.unit.records"
  | "debugger.chart.unit.jobs";

type DebuggerChartLegendKey =
  | "debugger.chart.legend.writesByEntity"
  | "debugger.chart.legend.topHooksByWrites"
  | "debugger.chart.legend.topHooksByDuration"
  | "debugger.chart.legend.topHooksErrors"
  | "debugger.chart.legend.topRoutes"
  | "debugger.chart.legend.statusCodes"
  | "debugger.chart.legend.topFeatures"
  | "debugger.chart.legend.topActions"
  | "debugger.chart.legend.timeline";

const BAR_CHART_UNIT_KEYS: Record<string, DebuggerChartUnitKey> = {
  "entities-by-writes": "debugger.chart.unit.writes",
  "hooks-by-writes": "debugger.chart.unit.writes",
  "hooks-by-duration": "debugger.chart.unit.milliseconds",
  hooks: "debugger.chart.unit.errors",
  routes: "debugger.chart.unit.milliseconds",
  statusCodes: "debugger.chart.unit.requests",
  features: "debugger.chart.unit.jobs",
  actions: "debugger.chart.unit.records",
};

const BAR_CHART_LEGEND_KEYS: Record<string, DebuggerChartLegendKey> = {
  "entities-by-writes": "debugger.chart.legend.writesByEntity",
  "hooks-by-writes": "debugger.chart.legend.topHooksByWrites",
  "hooks-by-duration": "debugger.chart.legend.topHooksByDuration",
  hooks: "debugger.chart.legend.topHooksErrors",
  routes: "debugger.chart.legend.topRoutes",
  statusCodes: "debugger.chart.legend.statusCodes",
  features: "debugger.chart.legend.topFeatures",
  actions: "debugger.chart.legend.topActions",
};

export function barChartValueUnitKey(
  chart: DebuggerBarChartStats,
): DebuggerChartUnitKey | null {
  return BAR_CHART_UNIT_KEYS[chart.id] ?? null;
}

export function barChartLegendKey(
  chart: DebuggerBarChartStats,
): DebuggerChartLegendKey | null {
  return BAR_CHART_LEGEND_KEYS[chart.id] ?? null;
}

export function timelineChartLegendKey(): DebuggerChartLegendKey {
  return "debugger.chart.legend.timeline";
}

export function timelineChartValueUnitKey(
  activeSource: DebugEventSource,
): DebuggerChartUnitKey {
  return activeSource === "requestPerf"
    ? "debugger.chart.unit.requests"
    : "debugger.chart.unit.executions";
}
