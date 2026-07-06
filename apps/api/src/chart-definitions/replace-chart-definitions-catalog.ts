import {
  computeCatalogReplacePlan,
  type ChartDefinitionsCatalogEnvelope,
  type ChartDefinitionRecord,
  type CreateChartDefinitionInput,
  type PatchChartDefinitionInput,
} from "@repo/chart-definitions";

import type { ChartDefinitionRepository } from "@repo/firestore-converters";

interface ReplaceChartDefinitionsCatalogDeps {
  readonly chartDefinitionRepository: ChartDefinitionRepository;
}

export class ChartCatalogReplaceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ChartCatalogReplaceError";
  }
}

interface ReplaceChartDefinitionsCatalogResult {
  readonly counts: {
    readonly created: number;
    readonly updated: number;
    readonly deleted: number;
  };
  readonly items: readonly ChartDefinitionRecord[];
}

function createPatchFromCreateInput(
  imported: CreateChartDefinitionInput,
): PatchChartDefinitionInput {
  return {
    name: imported.name,
    ...(imported.description !== undefined
      ? { description: imported.description }
      : {}),
    chartType: imported.chartType,
    ...(imported.displayMode !== undefined
      ? { displayMode: imported.displayMode }
      : {}),
    dataSource: imported.dataSource,
    ...(imported.series !== undefined ? { series: imported.series } : {}),
    ...(imported.xAxis !== undefined ? { xAxis: imported.xAxis } : {}),
    ...(imported.yAxis !== undefined ? { yAxis: imported.yAxis } : {}),
    ...(imported.legend !== undefined ? { legend: imported.legend } : {}),
    ...(imported.grid !== undefined ? { grid: imported.grid } : {}),
    ...(imported.animation !== undefined
      ? { animation: imported.animation }
      : {}),
    status: imported.status,
  };
}

export async function replaceChartDefinitionsCatalog(
  deps: ReplaceChartDefinitionsCatalogDeps,
  tenantId: string,
  catalog: ChartDefinitionsCatalogEnvelope,
): Promise<ReplaceChartDefinitionsCatalogResult> {
  const existing = await deps.chartDefinitionRepository.list(tenantId);
  const plan = computeCatalogReplacePlan({
    existing,
    imported: catalog.chartDefinitions,
  });

  for (const record of plan.toDelete) {
    await deps.chartDefinitionRepository.delete(tenantId, record.id);
  }

  for (const { existing: current, input } of plan.toUpdate) {
    await deps.chartDefinitionRepository.update(
      tenantId,
      current.id,
      createPatchFromCreateInput(input),
    );
  }

  for (const input of plan.toCreate) {
    await deps.chartDefinitionRepository.create(tenantId, input);
  }

  const items = await deps.chartDefinitionRepository.list(tenantId);

  return {
    counts: plan.counts,
    items,
  };
}
