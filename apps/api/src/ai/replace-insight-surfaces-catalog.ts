import {
  computeInsightSurfaceCatalogReplacePlan,
  type CreateInsightSurfaceInput,
  type InsightSurfaceDefinition,
  type InsightSurfacesCatalogEnvelope,
  type PatchInsightSurfaceInput,
} from "@repo/ai-context";

import type { InsightSurfaceRepository } from "@repo/firestore-converters";

interface ReplaceInsightSurfacesCatalogDeps {
  readonly insightSurfaceRepository: InsightSurfaceRepository;
}

interface ReplaceInsightSurfacesCatalogResult {
  readonly counts: {
    readonly created: number;
    readonly updated: number;
    readonly deleted: number;
  };
  readonly items: readonly InsightSurfaceDefinition[];
}

function createPatchFromCreateInput(
  imported: CreateInsightSurfaceInput,
): PatchInsightSurfaceInput {
  const { id: _id, ...patch } = imported;
  void _id;
  return patch;
}

export async function replaceInsightSurfacesCatalog(
  deps: ReplaceInsightSurfacesCatalogDeps,
  tenantId: string,
  catalog: InsightSurfacesCatalogEnvelope,
): Promise<ReplaceInsightSurfacesCatalogResult> {
  const existing = await deps.insightSurfaceRepository.list(tenantId);
  const plan = computeInsightSurfaceCatalogReplacePlan({
    existing,
    imported: catalog.insightSurfaces,
  });

  for (const record of plan.toDelete) {
    await deps.insightSurfaceRepository.delete(tenantId, record.id);
  }

  for (const { existing: current, input } of plan.toUpdate) {
    await deps.insightSurfaceRepository.update(
      tenantId,
      current.id,
      createPatchFromCreateInput(input),
    );
  }

  for (const input of plan.toCreate) {
    await deps.insightSurfaceRepository.create(tenantId, input);
  }

  const items = await deps.insightSurfaceRepository.list(tenantId);

  return {
    counts: plan.counts,
    items,
  };
}
