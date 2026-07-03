import {
  computeDataHooksCatalogReplacePlan,
  type CreateDataHookInput,
  type DataHooksCatalogEnvelope,
  type PatchDataHookInput,
} from "@repo/hooks";
import {
  validateCreateDataHookInput,
  validateDataHookActions,
  validateDataHookEntity,
} from "@repo/hooks";
import type { DataHookRepository } from "@repo/firestore-converters";

import type { EntityRuntimeContext } from "../entities/entity-runtime-context.js";
import type { FormulaRuntimeContext } from "../formulas/formula-runtime-context.js";
import type { HookRuntimeContext } from "./hook-runtime-context.js";

export class DataHookCatalogReplaceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DataHookCatalogReplaceError";
  }
}

interface ReplaceDataHooksCatalogDeps {
  readonly entityRuntime: EntityRuntimeContext;
  readonly hookRepository: DataHookRepository;
  readonly hookRuntime: HookRuntimeContext;
  readonly formulaRuntime: FormulaRuntimeContext;
}

interface ReplaceDataHooksCatalogOptions {
  readonly entity?: string;
}

interface ReplaceDataHooksCatalogResult {
  readonly counts: {
    readonly created: number;
    readonly updated: number;
    readonly deleted: number;
  };
  readonly items: Awaited<ReturnType<DataHookRepository["list"]>>;
}

function createPatchFromCreateInput(
  imported: CreateDataHookInput,
): PatchDataHookInput {
  return {
    name: imported.name,
    ...(imported.description !== undefined
      ? { description: imported.description }
      : {}),
    phase: imported.phase,
    trigger: imported.trigger,
    condition: imported.condition,
    actions: imported.actions,
    enabled: imported.enabled,
    order: imported.order,
    ...(imported.chainHooks !== undefined
      ? { chainHooks: imported.chainHooks }
      : {}),
    ...(imported.execution !== undefined
      ? { execution: imported.execution }
      : {}),
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

function filterByEntity<T extends { readonly entity: string }>(
  items: readonly T[],
  entity: string | undefined,
): readonly T[] {
  if (!entity) {
    return items;
  }
  return items.filter((item) => item.entity === entity);
}

export async function replaceDataHooksCatalog(
  deps: ReplaceDataHooksCatalogDeps,
  tenantId: string,
  catalog: DataHooksCatalogEnvelope,
  options: ReplaceDataHooksCatalogOptions = {},
): Promise<ReplaceDataHooksCatalogResult> {
  const entityScope = options.entity?.trim();
  if (entityScope) {
    const outOfScope = catalog.dataHooks.filter(
      (hook) => hook.entity !== entityScope,
    );
    if (outOfScope.length > 0) {
      throw new DataHookCatalogReplaceError(
        `Catalog import for entity "${entityScope}" contains hooks for other entities.`,
      );
    }
  }

  const allExisting = await deps.hookRepository.list(tenantId);
  const existing = filterByEntity(allExisting, entityScope);
  const imported = filterByEntity(catalog.dataHooks, entityScope);

  const plan = computeDataHooksCatalogReplacePlan({ existing, imported });

  await deps.entityRuntime.loadTenantDefinitions(tenantId);
  const availableNames = getAvailableEntityNames(deps.entityRuntime, tenantId);
  const availableFormulaNames =
    await deps.formulaRuntime.getAvailableFormulaNames(tenantId);
  const validationOptions = { availableFormulaNames };

  for (const hook of imported) {
    validateCreateDataHookInput(hook, availableNames, validationOptions);
  }

  for (const record of plan.toDelete) {
    await deps.hookRepository.delete(tenantId, record.id);
  }

  for (const { existing: current, input } of plan.toUpdate) {
    validateDataHookEntity(current.entity, availableNames);
    validateDataHookActions(input.actions, availableNames, validationOptions);
    await deps.hookRepository.update(
      tenantId,
      current.id,
      createPatchFromCreateInput(input),
    );
  }

  for (const input of plan.toCreate) {
    await deps.hookRepository.create(tenantId, input);
  }

  await deps.hookRuntime.reloadTenantHooks(tenantId);

  const items = entityScope
    ? (await deps.hookRepository.list(tenantId)).filter(
        (hook) => hook.entity === entityScope,
      )
    : await deps.hookRepository.list(tenantId);

  return {
    counts: plan.counts,
    items,
  };
}
