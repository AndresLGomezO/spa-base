import {
  defineEntityFromRecord,
  registerDynamicEntity,
  type EntityDefinitionRecord,
} from "@repo/dynamic-entities";
import type { DefinedEntity, FieldDefinitions } from "@repo/entities";
import { createEntityConverter } from "@repo/firestore-converters";
import type { TenantScopedEntityRepository } from "@repo/firestore-converters";
import { applySearchMirrorFields } from "@repo/entities";
import {
  createFirestoreAdminEntityRepository,
  type FirebaseAdminConfig,
} from "@repo/gcp-firebase";

type GenericRecord = { readonly id: string; readonly tenantId: string };

import type { EntityRuntimeForCrudHooks } from "../../hooks/crud-hook-deps.types.js";

function buildSeedRecord(
  tenantId: string,
  business: Record<string, unknown>,
  id: string,
  ownerId: string,
  now: string,
): Record<string, unknown> {
  return {
    ...business,
    id,
    tenantId,
    createdAt: now,
    updatedAt: now,
    ownerId,
    accessUserIds: [ownerId],
    sharedWith: {},
  };
}

function repositoryCacheKey(tenantId: string, entityName: string): string {
  return `${tenantId}:${entityName}`;
}

function getSeedEntityRepository(
  context: RatesRecordSeedContext,
  entity: DefinedEntity<string, FieldDefinitions>,
): TenantScopedEntityRepository<GenericRecord, unknown> {
  const key = repositoryCacheKey(context.tenantId, entity.name);
  const cached = context.repositoryCache.get(key);
  if (cached) {
    return cached;
  }

  const repository = createFirestoreAdminEntityRepository({
    config: context.config,
    collection: entity.metadata.collection,
    converter: createEntityConverter(entity),
  });
  context.repositoryCache.set(key, repository);
  return repository;
}

async function ensureRecord(
  tenantId: string,
  repository: TenantScopedEntityRepository<GenericRecord, unknown>,
  entity: DefinedEntity<string, FieldDefinitions>,
  id: string,
  ownerId: string,
  business: Record<string, unknown>,
): Promise<boolean> {
  const existing = await repository.findById(id, tenantId);
  const now = new Date().toISOString();
  const draft = applySearchMirrorFields(
    entity,
    buildSeedRecord(tenantId, business, id, ownerId, now),
  );

  if (existing) {
    const existingRecord = existing as Record<string, unknown>;
    const withMirrors = applySearchMirrorFields(entity, {
      ...existingRecord,
      ...business,
      ownerId,
      accessUserIds: [ownerId],
      updatedAt: now,
    });
    const parsed = entity.schema.parse(withMirrors);
    await repository.update(id, tenantId, parsed as GenericRecord);
    return false;
  }

  const parsed = entity.schema.parse(draft);
  await repository.create(tenantId, parsed as GenericRecord);
  return true;
}

export function createSeedHookEntityRuntime(
  context: RatesRecordSeedContext,
): EntityRuntimeForCrudHooks {
  return {
    resolveEntity(entityName, tenantId) {
      if (tenantId !== context.tenantId) {
        return undefined;
      }
      return context.entities.get(entityName);
    },
    getRepository(tenantId, entityName) {
      if (tenantId !== context.tenantId) {
        return undefined;
      }
      const entity = context.entities.get(entityName);
      if (!entity) {
        return undefined;
      }
      return getSeedEntityRepository(context, entity);
    },
  };
}

export async function loadRatesSeedRecord(
  context: RatesRecordSeedContext,
  entityName: string,
  id: string,
): Promise<Record<string, unknown> | null> {
  const entity = context.entities.get(entityName);
  if (!entity) {
    throw new Error(
      `Entity "${entityName}" is not registered for rates seed on tenant "${context.tenantId}".`,
    );
  }

  const repository = getSeedEntityRepository(context, entity);
  const existing = await repository.findById(id, context.tenantId);
  return existing ? (existing as Record<string, unknown>) : null;
}

export function snapshotRatesSeedRecord(
  context: RatesRecordSeedContext,
  entityName: string,
  id: string,
  business: Record<string, unknown>,
): Record<string, unknown> {
  const entity = context.entities.get(entityName);
  if (!entity) {
    throw new Error(
      `Entity "${entityName}" is not registered for rates seed on tenant "${context.tenantId}".`,
    );
  }

  const now = new Date().toISOString();
  const draft = applySearchMirrorFields(
    entity,
    buildSeedRecord(context.tenantId, business, id, context.ownerId, now),
  );
  return entity.schema.parse(draft) as Record<string, unknown>;
}

export type RatesRecordSeedContext = {
  readonly tenantId: string;
  readonly config: FirebaseAdminConfig;
  readonly entities: Map<string, DefinedEntity<string, FieldDefinitions>>;
  readonly ownerId: string;
  readonly repositoryCache: Map<
    string,
    TenantScopedEntityRepository<GenericRecord, unknown>
  >;
};

export function createRatesRecordSeedContext(
  tenantId: string,
  firebaseAdminConfig: FirebaseAdminConfig,
  definitionRecords: readonly EntityDefinitionRecord[],
  ownerId: string,
): RatesRecordSeedContext {
  for (const record of definitionRecords) {
    registerDynamicEntity(tenantId, record);
  }

  return {
    tenantId,
    config: firebaseAdminConfig,
    entities: new Map(
      definitionRecords.map((record) => [
        record.name,
        defineEntityFromRecord(record),
      ]),
    ),
    ownerId,
    repositoryCache: new Map(),
  };
}

export async function ensureRatesRecord(
  context: RatesRecordSeedContext,
  entityName: string,
  id: string,
  business: Record<string, unknown>,
): Promise<void> {
  const entity = context.entities.get(entityName);
  if (!entity) {
    throw new Error(
      `Entity "${entityName}" is not registered for rates seed on tenant "${context.tenantId}".`,
    );
  }

  const repository = getSeedEntityRepository(context, entity);
  await ensureRecord(
    context.tenantId,
    repository,
    entity,
    id,
    context.ownerId,
    business,
  );
}
