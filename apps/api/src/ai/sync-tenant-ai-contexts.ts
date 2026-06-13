import type { SerializableEntityDefinition } from "@repo/entities";
import { serializeEntityDefinition } from "@repo/entities";
import type {
  EntityCategoryRepository,
  TenantRepository,
} from "@repo/firestore-converters";
import type { FieldPathValidationDefinition } from "@repo/ui-builder-core";

import {
  computeEntityCatalogSourceHash,
  syncAllEntityAiContextsForTenant,
  upsertThemeAiContext,
  type TenantAiContextServiceDeps,
} from "@repo/ai-context";

import type { EntityRuntimeContext } from "../entities/entity-runtime-context.js";

export interface SyncTenantAiContextsDeps extends TenantAiContextServiceDeps {
  readonly tenantRepository: TenantRepository;
  readonly entityCategoryRepository: EntityCategoryRepository;
  readonly entityRuntime: EntityRuntimeContext;
}

function buildEntityLookup(
  entities: readonly SerializableEntityDefinition[],
): (target: string) => FieldPathValidationDefinition | undefined {
  const byName = new Map(
    entities.map((entity) => [entity.name, entity] as const),
  );
  return (target) => {
    const entity = byName.get(target);
    if (!entity) {
      return undefined;
    }
    return {
      name: entity.name,
      fields: Object.fromEntries(
        Object.entries(entity.fields).map(([name, meta]) => [
          name,
          {
            type: meta.type,
            ...(meta.relation ? { relation: meta.relation } : {}),
          },
        ]),
      ),
    };
  };
}

async function loadCategoryNames(
  entityCategoryRepository: EntityCategoryRepository,
  tenantId: string,
  entities: readonly SerializableEntityDefinition[],
): Promise<Record<string, string>> {
  const categoryIds = [
    ...new Set(
      entities
        .map((entity) => entity.navCategoryId)
        .filter((value): value is string => Boolean(value)),
    ),
  ];
  const names: Record<string, string> = {};
  await Promise.all(
    categoryIds.map(async (categoryId) => {
      const category = await entityCategoryRepository.getById(
        tenantId,
        categoryId,
      );
      if (category) {
        names[categoryId] = category.name;
      }
    }),
  );
  return names;
}

export async function syncThemeAiContextForTenant(
  deps: SyncTenantAiContextsDeps,
  tenantId: string,
): Promise<void> {
  const tenant = await deps.tenantRepository.getById(tenantId);
  if (!tenant) {
    return;
  }
  await upsertThemeAiContext(deps, tenantId, tenant.appearance);
}

export async function syncEntityAiContextsForTenant(
  deps: SyncTenantAiContextsDeps,
  tenantId: string,
): Promise<void> {
  const tenant = await deps.tenantRepository.getById(tenantId);
  if (!tenant) {
    return;
  }

  await deps.entityRuntime.loadTenantDefinitions(tenantId);
  const entities = deps.entityRuntime
    .getEntitiesForTenant(tenantId)
    .map(serializeEntityDefinition);
  const categoryNames = await loadCategoryNames(
    deps.entityCategoryRepository,
    tenantId,
    entities,
  );
  const sourceHash = computeEntityCatalogSourceHash(entities);

  await syncAllEntityAiContextsForTenant(
    deps,
    {
      tenant: {
        tenantId,
        tenantName: tenant.name,
        tenantStatus: tenant.status,
      },
      entities,
      categoryNames,
      resolveTarget: buildEntityLookup(entities),
    },
    sourceHash,
  );
}

export async function ensureUiBuilderAiContexts(
  deps: SyncTenantAiContextsDeps,
  tenantId: string,
  entityName: string,
): Promise<void> {
  await syncThemeAiContextForTenant(deps, tenantId);
  await syncEntityAiContextsForTenant(deps, tenantId);

  const entityId = `entity__${entityName}`;
  const cached = await deps.repository.get(tenantId, entityId);
  if (!cached) {
    throw new Error(`AI context for entity "${entityName}" is unavailable.`);
  }
}
