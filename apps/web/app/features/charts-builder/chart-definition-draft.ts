import type { ChartDefinitionRecipe } from "@repo/ui-builder-core";

import type { ChartDefinitionRecord } from "../../lib/api-client.js";

export interface ChartDefinitionDraft extends ChartDefinitionRecipe {
  readonly name: string;
  readonly description: string;
  readonly status: "ACTIVE" | "PAUSED";
}

export function buildDraftFromChartRecord(
  record: ChartDefinitionRecord,
): ChartDefinitionDraft {
  return {
    name: record.name,
    description: record.description ?? "",
    status: record.status,
    chartType: record.chartType,
    ...(record.displayMode !== undefined
      ? { displayMode: record.displayMode }
      : {}),
    dataSource: record.dataSource,
    ...(record.series !== undefined ? { series: record.series } : {}),
    ...(record.xAxis !== undefined ? { xAxis: record.xAxis } : {}),
    ...(record.yAxis !== undefined ? { yAxis: record.yAxis } : {}),
    ...(record.legend !== undefined ? { legend: record.legend } : {}),
    ...(record.grid !== undefined ? { grid: record.grid } : {}),
    ...(record.animation !== undefined ? { animation: record.animation } : {}),
  };
}

export function isChartDraftDirty(
  draft: ChartDefinitionDraft,
  record: ChartDefinitionRecord,
): boolean {
  return (
    JSON.stringify(buildDraftFromChartRecord(record)) !== JSON.stringify(draft)
  );
}

export function createDefaultChartDefinitionDraft(input: {
  readonly name: string;
  readonly chartType: ChartDefinitionRecipe["chartType"];
}): ChartDefinitionDraft {
  return {
    name: input.name.trim(),
    description: "",
    status: "ACTIVE",
    chartType: input.chartType,
    displayMode: "inline",
    dataSource: {
      type: "entityQuery",
      entityQueryDefinitionId: "",
      xFieldPath: "",
      yFieldPath: "",
    },
    series: [{ id: "default", label: input.name.trim() }],
    legend: { visible: false, position: "none" },
    xAxis: { visible: true, showTicks: true },
    yAxis: { visible: true, showTicks: true },
    grid: { visible: false },
    animation: { enabled: true, durationMs: 600 },
  };
}
