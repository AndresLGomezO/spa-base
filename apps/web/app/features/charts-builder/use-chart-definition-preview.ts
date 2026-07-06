import { useMemo } from "react";

import type { ResolvedChartComponentConfig } from "@repo/ui-builder-core";

import type { ChartDefinitionRecord } from "../../lib/api-client.js";
import { resolveChartComponentConfig } from "../ui-builder/resolve-chart-component-config.js";
import type { ChartDefinitionDraft } from "./chart-definition-draft.js";

interface ChartDefinitionPreviewModel {
  readonly previewRecord: ChartDefinitionRecord;
  readonly resolvedConfig: ResolvedChartComponentConfig;
  readonly needsLiveFetch: boolean;
}

export function useChartDefinitionPreview(
  draft: ChartDefinitionDraft,
  definitionId: string,
): ChartDefinitionPreviewModel {
  const previewRecord = useMemo(
    (): ChartDefinitionRecord => ({
      id: definitionId,
      tenantId: "preview",
      chartId: draft.name,
      name: draft.name,
      ...(draft.description.trim()
        ? { description: draft.description.trim() }
        : {}),
      chartType: draft.chartType,
      ...(draft.displayMode !== undefined
        ? { displayMode: draft.displayMode }
        : {}),
      dataSource: draft.dataSource as ChartDefinitionRecord["dataSource"],
      ...(draft.series !== undefined
        ? { series: draft.series as ChartDefinitionRecord["series"] }
        : {}),
      ...(draft.xAxis !== undefined ? { xAxis: draft.xAxis } : {}),
      ...(draft.yAxis !== undefined ? { yAxis: draft.yAxis } : {}),
      ...(draft.legend !== undefined ? { legend: draft.legend } : {}),
      ...(draft.grid !== undefined ? { grid: draft.grid } : {}),
      ...(draft.animation !== undefined ? { animation: draft.animation } : {}),
      ...(draft.donut !== undefined ? { donut: draft.donut } : {}),
      status: draft.status,
      version: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }),
    [definitionId, draft],
  );

  const resolvedConfig = useMemo(
    () =>
      resolveChartComponentConfig(
        { kind: "chart", chartDefinitionId: definitionId },
        previewRecord,
      ),
    [definitionId, previewRecord],
  );

  const needsLiveFetch = draft.dataSource.type !== "static";

  return {
    previewRecord,
    resolvedConfig,
    needsLiveFetch,
  };
}
