import {
  applyDescription,
  applyDisplayFieldToRecord,
  assertDynamicNameAvailable,
  assertNavCategoryExists,
  computeCatalogReplacePlan,
  computeCategoryReplacePlan,
  DynamicEntityError,
  getAvailableEntityNamesForTenant,
  unregisterDynamicEntity,
  validateCatalogCategoryDeleteSafety,
  validateCatalogDeleteSafety,
  validateDefinitionEvolution,
  validateRelationTargets,
  type CreateEntityDefinitionInput,
  type EntityDefinitionRecord,
  type EntityDefinitionsCatalogEnvelope,
  type PatchEntityDefinitionInput,
} from "@repo/dynamic-entities";
import type { EntityCategoryRepository } from "@repo/firestore-converters";

import type { EntityRuntimeContext } from "./entity-runtime-context.js";
import {
  syncEntityAiContextsForTenant,
  type SyncTenantAiContextsDeps,
} from "../ai/sync-tenant-ai-contexts.js";

interface ReplaceEntityDefinitionsCatalogDeps {
  readonly entityRuntime: EntityRuntimeContext;
  readonly entityCategoryRepository: EntityCategoryRepository;
  readonly tenantAiContextSync?: SyncTenantAiContextsDeps;
}

interface ReplaceEntityDefinitionsCatalogResult {
  readonly counts: {
    readonly created: number;
    readonly updated: number;
    readonly deleted: number;
  };
  readonly categoryCounts?: {
    readonly created: number;
    readonly updated: number;
    readonly deleted: number;
  };
  readonly items: readonly EntityDefinitionRecord[];
}

function createPatchFromCreateInput(
  imported: CreateEntityDefinitionInput,
): PatchEntityDefinitionInput {
  return {
    label: imported.label,
    description: imported.description ?? null,
    fields: imported.fields,
    ...(imported.tenantWideRead !== undefined
      ? { tenantWideRead: imported.tenantWideRead }
      : {}),
    ...(imported.inMemoryListQueries !== undefined
      ? { inMemoryListQueries: imported.inMemoryListQueries }
      : {}),
    ...(imported.hiddenFromNav !== undefined
      ? { hiddenFromNav: imported.hiddenFromNav }
      : {}),
    navCategoryId: imported.navCategoryId ?? null,
    navOrder: imported.navOrder ?? null,
    displayField: imported.displayField ?? null,
    ...(imported.ui ? { ui: imported.ui } : {}),
  };
}

function buildRecordFromCreateInput(
  input: CreateEntityDefinitionInput,
  tenantId: string,
): EntityDefinitionRecord {
  const now = new Date().toISOString();
  return {
    id: "pending",
    tenantId,
    name: input.name,
    label: input.label,
    ...(input.description?.trim()
      ? { description: input.description.trim() }
      : {}),
    fields: input.fields,
    ...(input.ui ? { ui: input.ui } : {}),
    ...(input.tenantWideRead === true ? { tenantWideRead: true } : {}),
    ...(input.inMemoryListQueries === true
      ? { inMemoryListQueries: true }
      : {}),
    ...(input.hiddenFromNav === true ? { hiddenFromNav: true } : {}),
    ...(input.navCategoryId ? { navCategoryId: input.navCategoryId } : {}),
    ...(input.navOrder !== undefined ? { navOrder: input.navOrder } : {}),
    ...(input.displayField ? { displayField: input.displayField } : {}),
    version: 1,
    createdAt: now,
    updatedAt: now,
  };
}

function buildNextForEvolution(
  current: EntityDefinitionRecord,
  imported: CreateEntityDefinitionInput,
): EntityDefinitionRecord {
  return applyDescription(
    applyDisplayFieldToRecord(
      {
        ...current,
        label: imported.label,
        fields: imported.fields,
        ...(imported.ui ? { ui: imported.ui } : {}),
        ...(imported.tenantWideRead !== undefined
          ? { tenantWideRead: imported.tenantWideRead }
          : {}),
        ...(imported.inMemoryListQueries !== undefined
          ? { inMemoryListQueries: imported.inMemoryListQueries }
          : {}),
      },
      {
        displayField: imported.displayField ?? null,
      },
    ),
    imported.description ?? null,
  );
}

export async function replaceEntityDefinitionsCatalog(
  deps: ReplaceEntityDefinitionsCatalogDeps,
  tenantId: string,
  catalog: EntityDefinitionsCatalogEnvelope,
): Promise<ReplaceEntityDefinitionsCatalogResult> {
  const existingCategories = await deps.entityCategoryRepository.list(tenantId);
  let categoryCounts: ReplaceEntityDefinitionsCatalogResult["categoryCounts"];

  if (catalog.entityCategories !== undefined) {
    const categoryPlan = computeCategoryReplacePlan({
      existing: existingCategories,
      imported: catalog.entityCategories,
    });
    const categoryDeleteErrors = validateCatalogCategoryDeleteSafety({
      toDelete: categoryPlan.toDelete,
      importedDefinitions: catalog.entityDefinitions,
    });
    if (categoryDeleteErrors.length > 0) {
      throw new DynamicEntityError(categoryDeleteErrors[0]!.message);
    }

    for (const category of categoryPlan.toDelete) {
      await deps.entityCategoryRepository.delete(tenantId, category.id);
    }

    for (const { existing, input } of categoryPlan.toUpdate) {
      await deps.entityCategoryRepository.update(tenantId, existing.id, {
        name: input.name,
        icon: input.icon,
        order: input.order,
      });
    }

    for (const input of categoryPlan.toCreate) {
      await deps.entityCategoryRepository.createWithId(tenantId, input.id, {
        name: input.name,
        icon: input.icon,
        order: input.order,
      });
    }

    categoryCounts = categoryPlan.counts;
  }

  const existing =
    await deps.entityRuntime.entityDefinitionRepository.list(tenantId);
  const plan = computeCatalogReplacePlan({
    existing,
    imported: catalog.entityDefinitions,
  });
  const survivingNames = new Set(
    catalog.entityDefinitions.map((definition) => definition.name),
  );
  const deleteErrors = validateCatalogDeleteSafety({
    existing,
    toDelete: plan.toDelete,
    survivingNames,
  });
  if (deleteErrors.length > 0) {
    throw new DynamicEntityError(deleteErrors[0]!.message);
  }

  await deps.entityRuntime.loadTenantDefinitions(tenantId);
  const availableNames = getAvailableEntityNamesForTenant(
    tenantId,
    catalog.entityDefinitions.map((definition) => definition.name),
  );

  for (const imported of catalog.entityDefinitions) {
    assertDynamicNameAvailable(imported.name);
    validateRelationTargets(
      buildRecordFromCreateInput(imported, tenantId),
      availableNames,
    );
    if (catalog.entityCategories === undefined) {
      await assertNavCategoryExists(
        deps.entityCategoryRepository,
        tenantId,
        imported.navCategoryId,
      );
    }
  }

  for (const record of plan.toDelete) {
    await deps.entityRuntime.entityDefinitionRepository.delete(
      tenantId,
      record.id,
    );
    unregisterDynamicEntity(tenantId, record.name);
  }

  for (const { existing: current, input } of plan.toUpdate) {
    const patch = createPatchFromCreateInput(input);
    const next = buildNextForEvolution(current, input);
    validateDefinitionEvolution(current, next);
    const updated = await deps.entityRuntime.entityDefinitionRepository.update(
      tenantId,
      current.id,
      patch,
    );
    await deps.entityRuntime.syncDefinition(updated, current);
  }

  for (const input of plan.toCreate) {
    const created = await deps.entityRuntime.entityDefinitionRepository.create(
      tenantId,
      input,
    );
    await deps.entityRuntime.syncDefinition(created);
  }

  await deps.entityRuntime.loadTenantDefinitions(tenantId, { force: true });
  deps.entityRuntime.ensureCatalogIndexes(tenantId);

  if (deps.tenantAiContextSync) {
    await syncEntityAiContextsForTenant(deps.tenantAiContextSync, tenantId);
  }

  const items =
    await deps.entityRuntime.entityDefinitionRepository.list(tenantId);

  return {
    counts: plan.counts,
    ...(categoryCounts ? { categoryCounts } : {}),
    items,
  };
}
