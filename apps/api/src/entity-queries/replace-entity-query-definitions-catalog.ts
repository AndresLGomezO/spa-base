import {
  computeCatalogReplacePlan,
  type CreateEntityQueryDefinitionInput,
  type EntityQueryDefinitionRecord,
  type EntityQueryDefinitionsCatalogEnvelope,
  type PatchEntityQueryDefinitionInput,
} from "@repo/entity-queries";

import type { EntityRuntimeContext } from "../entities/entity-runtime-context.js";
import type { EntityQueryDefinitionRepository } from "@repo/firestore-converters";

interface ReplaceEntityQueryDefinitionsCatalogDeps {
  readonly entityRuntime: EntityRuntimeContext;
  readonly entityQueryDefinitionRepository: EntityQueryDefinitionRepository;
}

export class EntityQueryCatalogReplaceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "EntityQueryCatalogReplaceError";
  }
}

interface ReplaceEntityQueryDefinitionsCatalogResult {
  readonly counts: {
    readonly created: number;
    readonly updated: number;
    readonly deleted: number;
  };
  readonly items: readonly EntityQueryDefinitionRecord[];
}

function createPatchFromCreateInput(
  imported: CreateEntityQueryDefinitionInput,
): PatchEntityQueryDefinitionInput {
  return {
    name: imported.name,
    ...(imported.description !== undefined
      ? { description: imported.description }
      : {}),
    filter: imported.filter,
    sort: imported.sort,
    ...(imported.select !== undefined ? { select: imported.select } : {}),
    limitMode: imported.limitMode,
    ...(imported.limitMode === "topN" && imported.limit !== undefined
      ? { limit: imported.limit }
      : {}),
    status: imported.status,
  };
}

function getAvailableEntityNames(
  entityRuntime: EntityRuntimeContext,
  tenantId: string,
): readonly string[] {
  return entityRuntime
    .getEntitiesForTenant(tenantId)
    .map((entity) => entity.name);
}

function assertEntityQueryImportValid(
  availableNames: readonly string[],
  imported: CreateEntityQueryDefinitionInput,
): void {
  if (!availableNames.includes(imported.sourceEntity)) {
    throw new EntityQueryCatalogReplaceError(
      `Unknown source entity "${imported.sourceEntity}".`,
    );
  }
}

export async function replaceEntityQueryDefinitionsCatalog(
  deps: ReplaceEntityQueryDefinitionsCatalogDeps,
  tenantId: string,
  catalog: EntityQueryDefinitionsCatalogEnvelope,
): Promise<ReplaceEntityQueryDefinitionsCatalogResult> {
  const existing = await deps.entityQueryDefinitionRepository.list(tenantId);
  const plan = computeCatalogReplacePlan({
    existing,
    imported: catalog.entityQueryDefinitions,
  });

  await deps.entityRuntime.loadTenantDefinitions(tenantId);
  const availableNames = getAvailableEntityNames(deps.entityRuntime, tenantId);

  for (const imported of catalog.entityQueryDefinitions) {
    assertEntityQueryImportValid(availableNames, imported);
  }

  for (const record of plan.toDelete) {
    await deps.entityQueryDefinitionRepository.delete(tenantId, record.id);
  }

  for (const { existing: current, input } of plan.toUpdate) {
    await deps.entityQueryDefinitionRepository.update(
      tenantId,
      current.id,
      createPatchFromCreateInput(input),
    );
  }

  for (const input of plan.toCreate) {
    await deps.entityQueryDefinitionRepository.create(tenantId, input);
  }

  const items = await deps.entityQueryDefinitionRepository.list(tenantId);

  return {
    counts: plan.counts,
    items,
  };
}
